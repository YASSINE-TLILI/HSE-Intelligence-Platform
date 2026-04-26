from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.exceptions import NotFoundError
from app.repositories.incident_repository import IncidentRepository
from app.repositories.report_repository import ReportRepository
from app.services.notification_service import NotificationService

_incident_repo = IncidentRepository()
_report_repo = ReportRepository()
_notif_service = NotificationService()


class ReportService:

    def _build_scope_filters(self, scope_type: str, scope_id: int | None) -> tuple[str, list]:
        where_clauses = ["DATE(i.date_declaration) BETWEEN %s AND %s"]
        extra_params: list = []
        scope_type_u = (scope_type or "GLOBAL").upper()
        if scope_type_u == "ZONE" and scope_id is not None:
            where_clauses.append("s.id_zone = %s")
            extra_params.append(scope_id)
        elif scope_type_u == "SECTEUR" and scope_id is not None:
            where_clauses.append("i.id_secteur = %s")
            extra_params.append(scope_id)
        return " AND ".join(where_clauses), extra_params

    def _df_records(self, df: pd.DataFrame) -> list[dict]:
        if df.empty:
            return []
        clean = df.where(pd.notnull(df), None)
        return clean.to_dict(orient="records")

    def generate_report(
        self,
        date_start: str,
        date_end: str,
        scope_type: str,
        scope_id: int | None,
        user_id: int,
    ) -> dict:
        where_sql, extra_params = self._build_scope_filters(scope_type, scope_id)
        params = [date_start, date_end, *extra_params]
        rows = _incident_repo.find_for_report(where_sql, params)

        df = pd.DataFrame(rows)
        if df.empty:
            kpi = {"totalIncidents": 0, "averageRisk": 0.0, "highRiskIncidents": 0, "closedRatePercent": 0.0}
            analytics = {
                "trendDaily": [], "averageRiskDaily": [],
                "byStatus": [], "byGravite": [], "bySecteur": [], "byZone": [], "byType": [],
            }
        else:
            df["date_declaration"] = pd.to_datetime(df["date_declaration"], errors="coerce")
            df["risk_score"] = pd.to_numeric(df["risk_score"], errors="coerce").fillna(0.0)
            df["statut"] = df["statut"].fillna("INCONNU")
            df["gravite"] = df["gravite"].fillna("INCONNU")
            df["nom_secteur"] = df["nom_secteur"].fillna("Secteur inconnu")
            df["id_zone"] = df["id_zone"].fillna(-1)
            df["type_incident"] = df["type_incident"].fillna("INCONNU")

            total = int(len(df))
            avg_risk = float(df["risk_score"].mean())
            high_risk_count = int((df["risk_score"] >= 70).sum())
            closed_rate = float((df["statut"] == "CLOTURE").mean() * 100.0)

            trend_df = (
                df.assign(day=df["date_declaration"].dt.date)
                .groupby("day", dropna=False).size().reset_index(name="incidents").sort_values("day")
            )
            trend_df["day"] = trend_df["day"].astype(str)

            risk_df = (
                df.assign(day=df["date_declaration"].dt.date)
                .groupby("day", dropna=False)["risk_score"].mean()
                .reset_index(name="averageRisk").sort_values("day")
            )
            risk_df["day"] = risk_df["day"].astype(str)
            risk_df["averageRisk"] = risk_df["averageRisk"].round(2)

            by_status_df = df.groupby("statut", dropna=False).size().reset_index(name="count").sort_values("count", ascending=False)
            by_gravite_df = df.groupby("gravite", dropna=False).size().reset_index(name="count").sort_values("count", ascending=False)
            by_secteur_df = df.groupby(["id_secteur", "nom_secteur"], dropna=False).size().reset_index(name="count").sort_values("count", ascending=False)
            by_zone_df = df.groupby("id_zone", dropna=False).size().reset_index(name="count").sort_values("count", ascending=False)
            by_type_df = df.groupby("type_incident", dropna=False).size().reset_index(name="count").sort_values("count", ascending=False)

            kpi = {
                "totalIncidents": total,
                "averageRisk": avg_risk,
                "highRiskIncidents": high_risk_count,
                "closedRatePercent": round(closed_rate, 2),
            }
            analytics = {
                "trendDaily": self._df_records(trend_df),
                "averageRiskDaily": self._df_records(risk_df),
                "byStatus": self._df_records(by_status_df),
                "byGravite": self._df_records(by_gravite_df),
                "bySecteur": self._df_records(by_secteur_df),
                "byZone": self._df_records(by_zone_df),
                "byType": self._df_records(by_type_df),
            }

        content = {
            "period": {"start": date_start, "end": date_end},
            "scope": {"type": scope_type, "id": scope_id},
            "kpi": kpi,
            "analytics": analytics,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

        report_id = _report_repo.create(date_start, date_end, scope_type, scope_id, content, user_id)
        _notif_service.create_for_roles(
            message=f"Rapport HSE #{report_id} disponible.",
            notification_type="RAPPORT_DISPONIBLE",
            roles=["RESPONSABLE_ENTITE", "RESPONSABLE_ZONE", "RESPONSABLE_SECTEUR", "ADMINISTRATEUR"],
        )
        return {"idReport": report_id, "content": content}

    def list_reports(self) -> list[dict]:
        return _report_repo.find_all()

    def get_report(self, report_id: int) -> dict:
        row = _report_repo.find_by_id(report_id)
        if not row:
            raise NotFoundError("Rapport introuvable.")
        return row

    def get_report_pdf_bytes(self, report_id: int) -> bytes:
        report = self.get_report(report_id)
        content = report.get("contenu_json", {})
        kpi = content.get("kpi", {})
        period = content.get("period", {})
        scope = content.get("scope", {})
        analytics = content.get("analytics", {})

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        def draw_line(text: str, size: int = 10, step: int = 16):
            nonlocal y
            if y < 60:
                pdf.showPage()
                y = height - 50
            pdf.setFont("Helvetica", size)
            pdf.drawString(40, y, text)
            y -= step

        draw_line(f"Rapport HSE #{report.get('id_report')}", size=16, step=24)
        draw_line(f"Periode: {period.get('start')} -> {period.get('end')}")
        draw_line(f"Scope: {scope.get('type')} (id={scope.get('id')})")
        draw_line("")
        draw_line("KPI", size=12, step=18)
        draw_line(f"- Total incidents: {kpi.get('totalIncidents', 0)}")
        draw_line(f"- Average risk: {round(float(kpi.get('averageRisk', 0)), 2)}")
        draw_line(f"- High risk incidents: {kpi.get('highRiskIncidents', 0)}")
        draw_line(f"- Closed rate (%): {kpi.get('closedRatePercent', 0)}")
        draw_line("")

        def draw_top(title: str, rows: list[dict], key_label: str):
            draw_line(title, size=12, step=18)
            if not rows:
                draw_line("- No data")
                return
            for row in rows[:10]:
                label = row.get(key_label, "N/A")
                count = row.get("count", 0)
                draw_line(f"- {label}: {count}")
            draw_line("")

        draw_top("By Status", analytics.get("byStatus", []), "statut")
        draw_top("By Gravite", analytics.get("byGravite", []), "gravite")
        draw_top("By Type", analytics.get("byType", []), "type_incident")

        def draw_bar_chart(title: str, rows: list[dict], label_key: str, value_key: str = "count"):
            nonlocal y
            if not rows:
                return
            if y < 260:
                pdf.showPage()
                y = height - 50

            chart_x, chart_y = 40, y - 180
            chart_w, chart_h = width - 80, 140
            axis_h, axis_w = chart_h - 30, chart_w - 60

            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(chart_x, y, title)
            y -= 16

            pdf.setStrokeColor(colors.lightgrey)
            pdf.rect(chart_x, chart_y, chart_w, chart_h, stroke=1, fill=0)
            pdf.setStrokeColor(colors.black)

            ax0_x, ax0_y = chart_x + 40, chart_y + 25
            pdf.line(ax0_x, ax0_y, ax0_x, ax0_y + axis_h)
            pdf.line(ax0_x, ax0_y, ax0_x + axis_w, ax0_y)

            top_rows = rows[:6]
            values = [float(r.get(value_key, 0) or 0) for r in top_rows]
            max_val = max(max(values), 1)
            bar_w = max(24, int((axis_w - 10) / max(len(top_rows), 1)) - 10)
            gap = 10

            for i, row in enumerate(top_rows):
                value = float(row.get(value_key, 0) or 0)
                label = str(row.get(label_key, "N/A"))
                bar_h = (value / max_val) * (axis_h - 12)
                bx = ax0_x + 8 + i * (bar_w + gap)
                by = ax0_y

                pdf.setFillColor(colors.HexColor("#3b82f6"))
                pdf.rect(bx, by, bar_w, bar_h, stroke=0, fill=1)
                pdf.setFillColor(colors.black)
                pdf.setFont("Helvetica", 7)
                pdf.drawCentredString(bx + bar_w / 2, by + bar_h + 4, str(int(value)))
                short_label = label[:12] + ("…" if len(label) > 12 else "")
                pdf.drawCentredString(bx + bar_w / 2, by - 10, short_label)

            y = chart_y - 18

        draw_bar_chart("Graph: Incidents par statut", analytics.get("byStatus", []), "statut")
        draw_bar_chart("Graph: Incidents par gravite", analytics.get("byGravite", []), "gravite")
        draw_bar_chart("Graph: Tendance journaliere", analytics.get("trendDaily", []), "day", "incidents")

        pdf.save()
        buffer.seek(0)
        return buffer.getvalue()

    def get_report_excel_bytes(self, report_id: int) -> bytes:
        report = self.get_report(report_id)
        content = report.get("contenu_json", {})
        kpi = content.get("kpi", {})
        analytics = content.get("analytics", {})

        summary_df = pd.DataFrame([
            {"metric": "totalIncidents", "value": kpi.get("totalIncidents", 0)},
            {"metric": "averageRisk", "value": kpi.get("averageRisk", 0)},
            {"metric": "highRiskIncidents", "value": kpi.get("highRiskIncidents", 0)},
            {"metric": "closedRatePercent", "value": kpi.get("closedRatePercent", 0)},
        ])

        sheets = {
            "summary": summary_df,
            "trend_daily": pd.DataFrame(analytics.get("trendDaily", [])),
            "risk_daily": pd.DataFrame(analytics.get("averageRiskDaily", [])),
            "by_status": pd.DataFrame(analytics.get("byStatus", [])),
            "by_gravite": pd.DataFrame(analytics.get("byGravite", [])),
            "by_secteur": pd.DataFrame(analytics.get("bySecteur", [])),
            "by_zone": pd.DataFrame(analytics.get("byZone", [])),
            "by_type": pd.DataFrame(analytics.get("byType", [])),
        }

        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            for sheet_name, df in sheets.items():
                export_df = df if not df.empty else pd.DataFrame([{"info": "No data"}])
                export_df.to_excel(writer, sheet_name=sheet_name, index=False)
        buffer.seek(0)
        return buffer.getvalue()