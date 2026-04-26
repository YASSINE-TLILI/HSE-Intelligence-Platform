# app/services/notification_service.py
"""
Workflow notifications :
  1. create_incident()         → notify_new_incident()      → email Responsable Secteur
  2. validate-sector           → notify_responsable_zone()  → email Responsable Zone
  3. validate-zone             → notify_responsable_entite()→ email Responsable Entité
  4. validate-entite           → notify_closure()           → notif in-app déclarant
  5. reject-sector             → notify_rejection()         → email Déclarant

Chaîne SQL utilisée pour trouver les responsables depuis incident.id_secteur :
  Étape 1 : secteur WHERE id_secteur = incident.id_secteur → id_responsable_secteur → utilisateur
  Étape 2 : secteur → zone WHERE id_zone = secteur.id_zone → id_responsable_zone → utilisateur
  Étape 3 : secteur → zone → entite WHERE id_entite = zone.id_entite → id_responsable_entite → utilisateur
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings
from app.core.database import fetch_one
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.repositories.incident_repository import IncidentRepository

_repo          = NotificationRepository()
_user_repo     = UserRepository()
_incident_repo = IncidentRepository()


# ─────────────────────────────────────────────────────────────────────────────
# URL helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_ngrok_url() -> str:
    """
    Retourne l'URL ngrok propre (sans espaces parasites).

    FIX Bug1 : .env avait NGROK_URL=" https://..." (espace devant) → .strip() corrige.
    FIX Bug2 : settings.ngrok_url (attribut Python minuscule du dataclass).
               L'ancien code utilisait getattr(settings, "NGROK_URL") → None car
               l'attribut s'appelle ngrok_url et non NGROK_URL.
    """
    raw = getattr(settings, "ngrok_url", "") or ""   # attribut minuscule du dataclass
    raw = raw.strip().rstrip("/")

    # Si c'est vide ou c'est encore localhost, utiliser app_url comme fallback
    if not raw or "localhost" in raw:
        fallback = getattr(settings, "app_url", "http://localhost:5173") or ""
        raw = fallback.strip().rstrip("/")

    return raw


def _frontend_link(incident_id: int) -> str:
    """
    Lien direct vers la page détail incident dans le frontend React.
    Ce lien est mis dans l'email → doit être accessible depuis n'importe où → ngrok.

    FIX Bug3 : l'ancien code générait http://localhost:5173/incidents/{id}
    qui est inaccessible depuis une autre machine que le serveur.
    Maintenant on utilise l'URL ngrok configurée dans .env.
    """
    return f"{_get_ngrok_url()}/incidents/{incident_id}"


# ─────────────────────────────────────────────────────────────────────────────
# SQL helpers — trouver les responsables depuis incident.id_secteur
# ─────────────────────────────────────────────────────────────────────────────

def _find_responsable_secteur(secteur_id: int) -> dict | None:
    """
    Étape 1.
    secteur.id_secteur = %s → secteur.id_responsable_secteur → utilisateur
    """
    return fetch_one(
        """
        SELECT u.id, u.nom, u.prenom, u.email
        FROM   secteur s
        JOIN   utilisateur u ON u.id = s.id_responsable_secteur
        WHERE  s.id_secteur = %s
          AND  s.id_responsable_secteur IS NOT NULL
          AND  u.active = 1
        LIMIT 1
        """,
        (secteur_id,),
    )


def _find_responsable_zone(secteur_id: int) -> dict | None:
    """
    Étape 2.
    secteur → zone.id_zone → zone.id_responsable_zone → utilisateur
    """
    return fetch_one(
        """
        SELECT u.id, u.nom, u.prenom, u.email,
               z.nom_zone
        FROM   secteur s
        JOIN   zone z         ON z.id_zone = s.id_zone
        JOIN   utilisateur u  ON u.id = z.id_responsable_zone
        WHERE  s.id_secteur = %s
          AND  z.id_responsable_zone IS NOT NULL
          AND  u.active = 1
        LIMIT 1
        """,
        (secteur_id,),
    )


def _find_responsable_entite(secteur_id: int) -> dict | None:
    """
    Étape 3.
    secteur → zone → entite.id_entite → entite.id_responsable_entite → utilisateur
    """
    return fetch_one(
        """
        SELECT u.id, u.nom, u.prenom, u.email,
               e.nom_entite
        FROM   secteur s
        JOIN   zone z         ON z.id_zone    = s.id_zone
        JOIN   entite e       ON e.id_entite  = z.id_entite
        JOIN   utilisateur u  ON u.id         = e.id_responsable_entite
        WHERE  s.id_secteur = %s
          AND  e.id_responsable_entite IS NOT NULL
          AND  u.active = 1
        LIMIT 1
        """,
        (secteur_id,),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Template HTML email
# ─────────────────────────────────────────────────────────────────────────────

def _html_email(title: str, body_html: str, cta_label: str, cta_url: str, color: str = "#2563eb") -> str:
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 4px 24px rgba(0,0,0,.08);">
      <tr>
        <td style="background:{color};padding:28px 36px;">
          <p style="margin:0;color:#fff;font-size:11px;letter-spacing:2px;
                    text-transform:uppercase;opacity:.8;">Plateforme HSE</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">{title}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;">
          {body_html}
          <div style="text-align:center;margin:32px 0 8px;">
            <a href="{cta_url}"
               style="display:inline-block;padding:14px 32px;background:{color};
                      color:#fff;text-decoration:none;border-radius:10px;
                      font-weight:700;font-size:15px;">
              {cta_label}
            </a>
          </div>
          <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:12px;">
            Lien direct :
            <a href="{cta_url}" style="color:{color};word-break:break-all;">{cta_url}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;
                   text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            © Plateforme HSE — notification automatique, ne pas répondre.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────────────────────────────────────

class NotificationService:

    # ── SMTP ──────────────────────────────────────────────────────────────────

    def _send_email(self, to_email: str, subject: str, html: str, plain: str = "") -> None:
        host   = (getattr(settings, "smtp_host", "") or "").strip()
        port   = int(getattr(settings, "smtp_port", 465) or 465)
        user   = (getattr(settings, "smtp_user", "") or "").strip()
        pwd    = (getattr(settings, "smtp_pass", "") or "").strip()
        sender = (getattr(settings, "smtp_from", "") or "").strip() or user
        secure = getattr(settings, "smtp_secure", True)

        if not host or not user or not pwd:
            print(f"[NOTIF] SMTP non configuré — email ignoré ({to_email})")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Plateforme HSE <{sender}>"
        msg["To"]      = to_email
        if plain:
            msg.attach(MIMEText(plain, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        try:
            if port == 465 or secure:
                with smtplib.SMTP_SSL(host, port) as srv:
                    srv.login(user, pwd)
                    srv.send_message(msg)
            else:
                with smtplib.SMTP(host, port) as srv:
                    srv.ehlo()
                    srv.starttls()
                    srv.login(user, pwd)
                    srv.send_message(msg)
            print(f"[NOTIF] ✓ Email envoyé → {to_email}")
        except Exception as exc:
            print(f"[NOTIF] ✗ Erreur email → {to_email} : {exc}")

    # ── Notification in-app ───────────────────────────────────────────────────

    def create_notification(self, user_id: int, message: str, notif_type: str, incident_id: Optional[int] = None) -> None:
        _repo.create(message, notif_type, user_id, incident_id)

    def create_for_roles(self, message: str, notification_type: str, roles: list[str], incident_id: Optional[int] = None) -> dict:
        count = 0
        for role in roles:
            for u in _user_repo.find_by_roles([role]):
                self.create_notification(u["id"], message, notification_type, incident_id)
                count += 1
        return {"notifications_created": count}

    # ── Étape 1 : Déclaration → Responsable Secteur ───────────────────────────

    def notify_new_incident(self, incident_id: int) -> None:
        """
        Appelé après create_incident().
        Trouve le responsable du secteur de l'incident et lui envoie email + notif.
        """
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            print(f"[NOTIF] Incident #{incident_id} introuvable")
            return

        secteur_id = incident.get("id_secteur")
        if not secteur_id:
            print(f"[NOTIF] Incident #{incident_id} : id_secteur manquant")
            return

        resp = _find_responsable_secteur(int(secteur_id))
        if not resp:
            print(f"[NOTIF] Secteur #{secteur_id} : aucun responsable actif assigné")
            return

        titre       = (incident.get("titre") or f"Incident #{incident_id}").strip()
        secteur_nom = (incident.get("secteur_name") or f"Secteur #{secteur_id}").strip()
        link        = _frontend_link(incident_id)

        print(f"[NOTIF] Envoi email → {resp['email']} (resp. secteur #{secteur_id}) : {link}")

        # In-app
        self.create_notification(
            resp["id"],
            f"Nouvel incident « {titre} » dans {secteur_nom} — validation requise.",
            "NOUVEL_INCIDENT",
            incident_id,
        )

        # Email
        body = f"""
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Bonjour <strong>{resp['prenom']} {resp['nom']}</strong>,
        </p>
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Un nouvel incident a été déclaré dans le secteur
          <strong>{secteur_nom}</strong>. Votre validation est requise.
        </p>
        <table style="width:100%;background:#f8fafc;border-radius:10px;padding:16px;
                      margin:20px 0;border-collapse:collapse;">
          <tr>
            <td style="color:#64748b;font-size:13px;padding:5px 10px;width:110px;">Incident</td>
            <td style="color:#0f172a;font-weight:600;font-size:14px;padding:5px 10px;">{titre}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:5px 10px;">Secteur</td>
            <td style="color:#0f172a;font-size:14px;padding:5px 10px;">{secteur_nom}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;padding:5px 10px;">Référence</td>
            <td style="color:#0f172a;font-size:14px;padding:5px 10px;">#{incident_id}</td>
          </tr>
        </table>
        <p style="color:#64748b;font-size:13px;">
          Cliquez pour <strong>valider</strong> ou <strong>rejeter</strong> la déclaration.
        </p>
        """
        self._send_email(
            resp["email"],
            f"[HSE] Nouvel incident à valider — {titre}",
            _html_email("Nouvel incident à valider", body, "Consulter et valider →", link, "#2563eb"),
            f"Nouvel incident « {titre} » dans {secteur_nom}. Lien : {link}",
        )

    # ── Étape 2 : Validation secteur → Responsable Zone ──────────────────────

    def notify_responsable_zone(self, incident_id: int) -> None:
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            return

        secteur_id = incident.get("id_secteur")
        if not secteur_id:
            return

        resp = _find_responsable_zone(int(secteur_id))
        if not resp:
            print(f"[NOTIF] Zone du secteur #{secteur_id} : aucun responsable actif")
            return

        titre    = (incident.get("titre") or f"Incident #{incident_id}").strip()
        zone_nom = (resp.get("nom_zone") or incident.get("zone_name") or "votre zone").strip()
        link     = _frontend_link(incident_id)

        print(f"[NOTIF] Envoi email → {resp['email']} (resp. zone) : {link}")

        self.create_notification(
            resp["id"],
            f"Incident « {titre} » validé secteur — votre validation zone est requise.",
            "CHANGEMENT_STATUT",
            incident_id,
        )

        body = f"""
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Bonjour <strong>{resp['prenom']} {resp['nom']}</strong>,
        </p>
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          L'incident <strong>« {titre} »</strong> a été validé au niveau secteur.
          Votre validation de <strong>zone ({zone_nom})</strong> est maintenant requise.
        </p>
        <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;
                    padding:14px 18px;margin:20px 0;">
          <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;">
            ✓ Secteur validé &nbsp;·&nbsp; ⏳ En attente : Zone
          </p>
        </div>
        """
        self._send_email(
            resp["email"],
            f"[HSE] Validation zone requise — {titre}",
            _html_email("Validation de zone requise", body, "Valider l'incident →", link, "#0891b2"),
            f"Incident « {titre} » — validation zone requise. Lien : {link}",
        )

    # ── Étape 3 : Validation zone → Responsable Entité ───────────────────────

    def notify_responsable_entite(self, incident_id: int) -> None:
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            return

        secteur_id = incident.get("id_secteur")
        if not secteur_id:
            return

        resp = _find_responsable_entite(int(secteur_id))
        if not resp:
            print(f"[NOTIF] Entité du secteur #{secteur_id} : aucun responsable actif")
            return

        titre      = (incident.get("titre") or f"Incident #{incident_id}").strip()
        entite_nom = (resp.get("nom_entite") or incident.get("nom_entite") or "votre entité").strip()
        link       = _frontend_link(incident_id)

        print(f"[NOTIF] Envoi email → {resp['email']} (resp. entité) : {link}")

        self.create_notification(
            resp["id"],
            f"Incident « {titre} » validé zone — votre validation HSE est requise.",
            "CHANGEMENT_STATUT",
            incident_id,
        )

        body = f"""
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Bonjour <strong>{resp['prenom']} {resp['nom']}</strong>,
        </p>
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          L'incident <strong>« {titre} »</strong> a été validé aux niveaux secteur et zone.
          Votre <strong>validation HSE finale</strong> est requise
          pour l'entité <strong>{entite_nom}</strong>.
        </p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;
                    padding:14px 18px;margin:20px 0;">
          <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">
            ✓ Secteur validé &nbsp;·&nbsp; ✓ Zone validée &nbsp;·&nbsp; ⏳ En attente : HSE
          </p>
        </div>
        <p style="color:#64748b;font-size:13px;">Après votre validation, l'incident sera clôturé.</p>
        """
        self._send_email(
            resp["email"],
            f"[HSE] Validation HSE finale — {titre}",
            _html_email("Validation HSE finale requise", body, "Valider et clôturer →", link, "#7c3aed"),
            f"Incident « {titre} » — validation HSE requise. Lien : {link}",
        )

    # ── Rejet : notifier le déclarant ─────────────────────────────────────────

    def notify_rejection(self, incident_id: int) -> None:
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            return

        declarant_id = incident.get("id_declarant")
        if not declarant_id:
            return

        declarant = _user_repo.find_by_id(int(declarant_id))
        if not declarant:
            return

        titre = (incident.get("titre") or f"Incident #{incident_id}").strip()
        link  = _frontend_link(incident_id)

        self.create_notification(
            declarant["id"],
            f"Votre déclaration « {titre} » a été rejetée — reclassifiée en anomalie.",
            "CHANGEMENT_STATUT",
            incident_id,
        )

        body = f"""
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Bonjour <strong>{declarant['prenom']} {declarant['nom']}</strong>,
        </p>
        <p style="color:#334155;font-size:15px;line-height:1.7;">
          Votre déclaration <strong>« {titre} »</strong> a été
          <strong>rejetée</strong> par le responsable de secteur
          et reclassifiée en <strong>anomalie</strong>.
        </p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;
                    padding:14px 18px;margin:20px 0;">
          <p style="margin:0;color:#b91c1c;font-size:13px;font-weight:600;">
            ✗ Déclaration rejetée — reclassifiée en anomalie
          </p>
        </div>
        """
        self._send_email(
            declarant["email"],
            f"[HSE] Déclaration rejetée — {titre}",
            _html_email("Déclaration rejetée", body, "Voir le détail →", link, "#dc2626"),
            f"Votre déclaration « {titre} » a été rejetée. Lien : {link}",
        )

    # ── Clôture ───────────────────────────────────────────────────────────────

    def notify_closure(self, incident_id: int) -> None:
        incident = _incident_repo.find_by_id(incident_id)
        if not incident:
            return

        titre = (incident.get("titre") or f"Incident #{incident_id}").strip()

        declarant_id = incident.get("id_declarant")
        if declarant_id:
            self.create_notification(
                int(declarant_id),
                f"L'incident « {titre} » a été validé et clôturé.",
                "CHANGEMENT_STATUT",
                incident_id,
            )

        self.create_for_roles(
            f"Incident « {titre} » — workflow clôturé.",
            "CHANGEMENT_STATUT",
            ["RESPONSABLE_SECTEUR", "RESPONSABLE_ZONE", "ADMINISTRATEUR"],
            incident_id,
        )

    # ── Backward compat ───────────────────────────────────────────────────────

    def notify_responsable_secteur(self, incident_id: int) -> None:
        self.notify_new_incident(incident_id)

    def send_email(self, to_email: str, subject: str, body: str) -> None:
        self._send_email(to_email, subject, body, body)

    def build_link(self, incident_id: int) -> str:
        return _frontend_link(incident_id)