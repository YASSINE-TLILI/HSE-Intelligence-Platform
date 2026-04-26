# app/repositories/incident_repository.py

from typing import Any

from app.core.database import db_cursor, fetch_all, fetch_one
from app.core.constants import STATUTS_EN_COURS, STATUTS_RESOLUS


INCIDENT_SELECT = """
SELECT
  i.id_incident,
  i.description,
  i.date_declaration,
  i.statut,
  i.gravite,
  i.risk_score,
  i.id_secteur,
  i.id_entite,
  i.localisation_gps,
  i.type_incident,
  z.nom_zone AS zone_name,
  s.nom_secteur AS secteur_name,
  e.nom_entite,
  CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS reporter_name,
  p.chemin_fichier AS photo_path
FROM incident i
LEFT JOIN secteur s ON s.id_secteur = i.id_secteur
LEFT JOIN zone z ON z.id_zone = s.id_zone
LEFT JOIN entite e ON e.id_entite = COALESCE(i.id_entite, z.id_entite)
LEFT JOIN utilisateur u ON u.id = i.id_declarant
LEFT JOIN photo p ON p.id_incident = i.id_incident
"""


class IncidentRepository:
    """Accès aux données pour la table incident."""

    def find_by_id(self, incident_id: int) -> dict[str, Any] | None:
        rows = fetch_all(f"{INCIDENT_SELECT} WHERE i.id_incident = %s LIMIT 1", (incident_id,))
        print("DEBUG RESULT:", rows, flush=True)
        return rows[0] if rows else None

    def find_all_in_scope(self, where_sql: str, where_params: tuple) -> list[dict[str, Any]]:
        return fetch_all(
            f"{INCIDENT_SELECT} WHERE ({where_sql}) ORDER BY i.date_declaration DESC",
            where_params,
        )
        
    def find_in_scope_by_id(self, incident_id: int, where_sql: str, where_params: tuple) -> dict[str, Any] | None:
        return fetch_one(
            f"SELECT i.id_incident FROM incident i WHERE i.id_incident = %s AND ({where_sql}) LIMIT 1",
            (incident_id, *where_params),
        )
    def get_stats_by_scope(self, role: str, id_scope: int):
        where_sql, where_params = self.build_scope_filter(role, id_scope)
        return self.get_stats(where_sql, where_params, id_scope)

    def build_scope_filter(self,role: str, id_scope: int):
        if role == "RESPONSABLE_SECTEUR":
            return "i.id_secteur = %s", (id_scope,)

        elif role == "RESPONSABLE_ZONE":
            return """
            i.id_secteur IN (
                SELECT id_secteur
                FROM secteur
                WHERE id_zone = %s
            )
            """, (id_scope,)

        elif role == "RESPONSABLE_ENTITE":
            return """
            i.id_secteur IN (
                SELECT s.id_secteur
                FROM secteur s
                JOIN zone z ON s.id_zone = z.id_zone
                WHERE z.id_entite = %s
            )
            """, (id_scope,)

        elif role == "ADMIN":
            return "1=1", ()

        else:
            raise ValueError("Role non supporté")
        
    
    def get_stats(self, where_sql: str, where_params: tuple, role: str = None, id_scope: int = None, user_id: int = None) -> dict[str, Any]:
        """
        Retourne les compteurs KPI : total, incidents, anomalies, en_cours, resolus.
        Utilise le where_sql et where_params provenant de build_scope_filter.
        """
        placeholders_en_cours = ",".join(["%s"] * len(STATUTS_EN_COURS))
        placeholders_resolus  = ",".join(["%s"] * len(STATUTS_RESOLUS))

        # Construction de la requête SQL de base avec le filtre de scope
        sql = f"""
            SELECT
            COUNT(*)                                                              AS total,
            SUM(CASE WHEN i.type_incident = 'incident'  THEN 1 ELSE 0 END)       AS total_incidents,
            SUM(CASE WHEN i.type_incident = 'anomalie'  THEN 1 ELSE 0 END)       AS total_anomalies,
            SUM(CASE WHEN i.statut IN ({placeholders_en_cours}) THEN 1 ELSE 0 END) AS en_cours,
            SUM(CASE WHEN i.statut IN ({placeholders_resolus})  THEN 1 ELSE 0 END) AS resolus
            FROM incident i
            WHERE ({where_sql})
        """
        params = [
            *STATUTS_EN_COURS,
            *STATUTS_RESOLUS,
            *where_params
        ]
        row = fetch_one(sql, tuple(params))        
        # Initialiser le résultat de base
        result = {
            "total": int(row.get("total") or 0) if row else 0,
            "total_incidents": int(row.get("total_incidents") or 0) if row else 0,
            "total_anomalies": int(row.get("total_anomalies") or 0) if row else 0,
            "en_cours": int(row.get("en_cours") or 0) if row else 0,
            "resolus": int(row.get("resolus") or 0) if row else 0,
            "waiting_for_validation": 0
        }
        
        # Si on a un rôle et un id_scope, compter les incidents en attente de validation
        if role and id_scope and role != "ADMIN":
            waiting_count = self._count_waiting_incidents(role, id_scope, where_sql, where_params)
            result["waiting_for_validation"] = waiting_count
        
        return result
    def _count_waiting_incidents(self, role: str, id_scope: int, base_where_sql: str, base_where_params: tuple) -> int:
        """
        Compte les incidents en attente de validation pour un rôle spécifique.
        Utilise la même logique de scope que build_scope_filter.
        """
        # Déterminer le statut d'attente selon le rôle
        waiting_status = None
        if role == "RESPONSABLE_SECTEUR":
            waiting_status = "En attente"
        elif role == "RESPONSABLE_ZONE":
            waiting_status = "VALIDE_SECTEUR"  # ou EN_ATTENTE_VALIDATION_ZONE selon votre modèle
        elif role == "RESPONSABLE_ENTITE":
            waiting_status = "VALIDE_ZONE"  # ou EN_ATTENTE_VALIDATION_ENTITE
        
        if not waiting_status:
            return 0
        
        # Construire le scope spécifique pour ce rôle
        if role == "RESPONSABLE_SECTEUR":
            scope_sql = "i.id_secteur = %s"
            scope_params = (id_scope,)
        elif role == "RESPONSABLE_ZONE":
            scope_sql = """
                i.id_secteur IN (
                    SELECT id_secteur
                    FROM secteur
                    WHERE id_zone = %s
                )
            """
            scope_params = (id_scope,)
        elif role == "RESPONSABLE_ENTITE":
            scope_sql = """
                i.id_secteur IN (
                    SELECT s.id_secteur
                    FROM secteur s
                    JOIN zone z ON s.id_zone = z.id_zone
                    WHERE z.id_entite = %s
                )
            """
            scope_params = (id_scope,)
        else:
            return 0
        
        # Compter les incidents avec ce statut ET dans le scope
        sql = f"""
            SELECT COUNT(*) AS c
            FROM incident i
            WHERE i.statut = %s
            AND ({scope_sql})
            AND ({base_where_sql})
        """
        
        params = (waiting_status,) + scope_params + base_where_params
        row = fetch_one(sql, params)
        
        return int((row or {}).get("c") or 0)
    def create(
        self,
        description: str,
        gravite: str,
        risk_score: int,
        localisation_gps: str,
        declarant_id: int,
        secteur_id: int,
        entite_id: int,
        type_incident: str = "incident",
    ) -> int:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                """
                INSERT INTO incident
                  (description, statut, gravite, probabilite, exposition, niveau_urgence,
                   priorite, risk_score, localisation_gps, type_incident, id_declarant, id_secteur, id_entite)
                VALUES
                  (%s, %s, 'En attente', %s, 1, 1, 'MOYEN', 2, %s, %s, %s, %s, %s, %s)
                """,
                (description, gravite, risk_score, localisation_gps,
                 type_incident, declarant_id, secteur_id, entite_id),
            )
            return int(cursor.lastrowid)

    def update(
        self,
        incident_id: int,
        description: str,
        statut: str,
        gravite: str,
        risk_score: int,
        localisation_gps: str,
        secteur_id: int,
        entite_id: int,
        type_incident: str = "incident",
    ) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute(
                """
                UPDATE incident
                SET description = %s, statut = %s, gravite = %s,
                    risk_score = %s, localisation_gps = %s, id_secteur = %s,
                    id_entite = %s, type_incident = %s
                WHERE id_incident = %s
                """,
                (description, statut, gravite, risk_score, localisation_gps,
                 secteur_id, entite_id, type_incident, incident_id),
            )
            return int(affected)

    def delete(self, incident_id: int) -> int:
        with db_cursor() as (_conn, cursor):
            affected = cursor.execute("DELETE FROM incident WHERE id_incident = %s", (incident_id,))
            return int(affected)

    def update_status(self, incident_id: int, status: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "UPDATE incident SET statut = %s WHERE id_incident = %s",
                (status, incident_id),
            )

    def find_photo(self, incident_id: int) -> dict[str, Any] | None:
        return fetch_one("SELECT chemin_fichier FROM photo WHERE id_incident = %s LIMIT 1", (incident_id,))

    def insert_photo(self, incident_id: int, chemin: str, annotation: str) -> None:
        with db_cursor() as (_conn, cursor):
            cursor.execute(
                "INSERT INTO photo (chemin_fichier, annotation, id_incident) VALUES (%s, %s, %s)",
                (chemin, annotation, incident_id),
            )

    def delete_photos(self, incident_id: int) -> list[dict[str, Any]]:
        rows = fetch_all("SELECT chemin_fichier FROM photo WHERE id_incident = %s", (incident_id,))
        with db_cursor() as (_conn, cursor):
            cursor.execute("DELETE FROM photo WHERE id_incident = %s", (incident_id,))
        return rows

    def find_by_risk_in_zone(self, zone_id: int) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT i.risk_score
            FROM incident i
            INNER JOIN secteur s ON s.id_secteur = i.id_secteur
            WHERE s.id_zone = %s
            """,
            (zone_id,),
        )

    def find_by_risk_in_sector(self, sector_id: int) -> list[dict[str, Any]]:
        return fetch_all("SELECT risk_score FROM incident WHERE id_secteur = %s", (sector_id,))

    def find_all_risk_scores(self) -> list[dict[str, Any]]:
        return fetch_all("SELECT risk_score FROM incident")

    def find_in_scope_by_statuses(
        self, statuses: list[str], where_scope: str, params_scope: tuple
    ) -> list[dict[str, Any]]:
        placeholders = ",".join(["%s"] * len(statuses))
        return fetch_all(
            f"""
            SELECT
              i.id_incident,
              i.description,
              i.statut,
              i.gravite,
              i.type_incident,
              i.date_declaration,
              i.risk_score,
              s.nom_secteur,
              z.nom_zone,
              e.nom_entite,
              CONCAT(COALESCE(u.prenom,''), ' ', COALESCE(u.nom,'')) AS nom,
              '' AS prenom,
              i.date_declaration AS date_creation
            FROM incident i
            LEFT JOIN secteur s ON s.id_secteur = i.id_secteur
            LEFT JOIN zone z    ON z.id_zone    = s.id_zone
            LEFT JOIN entite e  ON e.id_entite  = COALESCE(i.id_entite, z.id_entite)
            LEFT JOIN utilisateur u ON u.id = i.id_declarant
            WHERE i.statut IN ({placeholders})
              AND ({where_scope})
            ORDER BY i.date_declaration DESC
            """,
            tuple([*statuses, *params_scope]),
        )
    def get_secteur_by_id(self, secteur_id: int):
            return fetch_one(
                "SELECT id_responsable_secteur FROM secteur WHERE id_secteur = %s",
                (secteur_id,)
            )


    def get_zone_by_secteur(self, secteur_id: int):
        return fetch_one("""
            SELECT z.id_responsable_zone
            FROM secteur s
            INNER JOIN zone z ON z.id_zone = s.id_zone
            WHERE s.id_secteur = %s
        """, (secteur_id,))


    def get_entite_by_id(self, entite_id: int):
        return fetch_one(
            "SELECT id_responsable_entite FROM entite WHERE id_entite = %s",
            (entite_id,)
        )
    def find_for_report(self, where_sql: str, params: list) -> list[dict[str, Any]]:
        return fetch_all(
            f"""
            SELECT
              i.id_incident, i.date_declaration, i.statut, i.gravite,
              i.risk_score, i.type_incident, i.id_secteur,
              s.nom_secteur, s.id_zone
            FROM incident i
            LEFT JOIN secteur s ON s.id_secteur = i.id_secteur
            WHERE {where_sql}
            ORDER BY i.date_declaration ASC
            """,
            tuple(params),
        )

    def find_references(self) -> list[dict[str, Any]]:
        return fetch_all(
            """
            SELECT
              e.id_entite, e.nom_entite,
              z.id_zone, z.nom_zone,
              s.id_secteur, s.nom_secteur
            FROM entite e
            LEFT JOIN zone z ON z.id_entite = e.id_entite
            LEFT JOIN secteur s ON s.id_zone = z.id_zone
            ORDER BY e.nom_entite ASC, z.nom_zone ASC, s.nom_secteur ASC
            """
        )

    def find_secteur_with_zone(self, secteur_id: int) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT s.id_secteur, z.id_entite
            FROM secteur s
            INNER JOIN zone z ON z.id_zone = s.id_zone
            WHERE s.id_secteur = %s LIMIT 1
            """,
            (secteur_id,),
        )

    def find_secteur_by_nom(self, nom: str) -> dict[str, Any] | None:
        rows = fetch_all("SELECT id_secteur FROM secteur WHERE nom_secteur = %s LIMIT 1", (nom,))
        return rows[0] if rows else None

    def count_secteurs_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM secteur WHERE id_responsable_secteur = %s", (user_id,))
        return int((row or {}).get("c") or 0)

    def count_zones_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM zone WHERE id_responsable_zone = %s", (user_id,))
        return int((row or {}).get("c") or 0)

    def count_entites_of_responsable(self, user_id: int) -> int:
        row = fetch_one("SELECT COUNT(*) AS c FROM entite WHERE id_responsable_entite = %s", (user_id,))
        return int((row or {}).get("c") or 0)
    
    
    def get_top_declarants(self, days: int, limit: int = 10) -> list[dict]:
        """Retourne le top N des déclarants avec le plus d'incidents signalés."""
        return fetch_all(
            """
            SELECT
                u.id,
                CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS full_name,
                u.prenom,
                u.nom,
                COUNT(i.id_incident) AS total_incidents
            FROM utilisateur u
            INNER JOIN incident i ON i.id_declarant = u.id
            WHERE i.date_declaration >= DATE_SUB(NOW(), INTERVAL %s DAY)
            GROUP BY u.id, u.nom, u.prenom
            ORDER BY total_incidents DESC
            LIMIT %s
            """,
            (days, limit),
        )
    def get_priority_distribution(
        self, where_sql: str, where_params: tuple,
        date_from: str = None, date_to: str = None
    ) -> list[dict]:
        """Répartition par gravité/priorité avec filtre de date optionnel."""
        date_filter = ""
        date_params = []
        if date_from:
            date_filter += " AND i.date_declaration >= %s"
            date_params.append(date_from)
        if date_to:
            date_filter += " AND i.date_declaration <= %s"
            date_params.append(date_to + " 23:59:59")
 
        sql = f"""
            SELECT
                i.gravite,
                i.type_incident,
                COUNT(*) AS total
            FROM incident i
            WHERE ({where_sql}){date_filter}
            GROUP BY i.gravite, i.type_incident
            ORDER BY FIELD(i.gravite, 'CRITIQUE', 'GRAVE', 'MODEREE', 'FAIBLE')
        """
        params = list(where_params) + date_params
        return fetch_all(sql, tuple(params))
 
    def get_status_distribution(
        self, where_sql: str, where_params: tuple,
        date_from: str = None, date_to: str = None
    ) -> list[dict]:
        """Répartition par statut avec filtre de date optionnel."""
        date_filter = ""
        date_params = []
        if date_from:
            date_filter += " AND i.date_declaration >= %s"
            date_params.append(date_from)
        if date_to:
            date_filter += " AND i.date_declaration <= %s"
            date_params.append(date_to + " 23:59:59")
 
        sql = f"""
            SELECT
                i.statut,
                COUNT(*) AS total
            FROM incident i
            WHERE ({where_sql}){date_filter}
            GROUP BY i.statut
            ORDER BY total DESC
        """
        params = list(where_params) + date_params
        return fetch_all(sql, tuple(params))
 
    def get_incidents_by_secteur(self, secteur_ids: list[int], days: int) -> list[dict]:
        """Incidents par secteur (pour zone/entité responsables)."""
        if not secteur_ids:
            return []
        placeholders = ",".join(["%s"] * len(secteur_ids))
        return fetch_all(
            f"""
            SELECT
                s.id_secteur,
                s.nom_secteur,
                z.nom_zone,
                COUNT(i.id_incident) AS total,
                SUM(CASE WHEN i.statut = 'CLOTURE' THEN 1 ELSE 0 END) AS clotures,
                SUM(CASE WHEN i.gravite = 'CRITIQUE' THEN 1 ELSE 0 END) AS critiques,
                SUM(CASE WHEN i.gravite = 'GRAVE' THEN 1 ELSE 0 END) AS graves
            FROM secteur s
            LEFT JOIN zone z ON z.id_zone = s.id_zone
            LEFT JOIN incident i ON i.id_secteur = s.id_secteur
                AND i.date_declaration >= DATE_SUB(NOW(), INTERVAL %s DAY)
            WHERE s.id_secteur IN ({placeholders})
            GROUP BY s.id_secteur, s.nom_secteur, z.nom_zone
            ORDER BY total DESC
            """,
            tuple([days] + secteur_ids),
        )
 
    def get_incidents_by_zone(self, zone_ids: list[int], days: int) -> list[dict]:
        """Incidents groupés par zone."""
        if not zone_ids:
            return []
        placeholders = ",".join(["%s"] * len(zone_ids))
        return fetch_all(
            f"""
            SELECT
                z.id_zone,
                z.nom_zone,
                e.nom_entite,
                COUNT(i.id_incident) AS total,
                SUM(CASE WHEN i.statut = 'CLOTURE' THEN 1 ELSE 0 END) AS clotures,
                SUM(CASE WHEN i.gravite = 'CRITIQUE' THEN 1 ELSE 0 END) AS critiques
            FROM zone z
            LEFT JOIN entite e ON e.id_entite = z.id_entite
            LEFT JOIN secteur s ON s.id_zone = z.id_zone
            LEFT JOIN incident i ON i.id_secteur = s.id_secteur
                AND i.date_declaration >= DATE_SUB(NOW(), INTERVAL %s DAY)
            WHERE z.id_zone IN ({placeholders})
            GROUP BY z.id_zone, z.nom_zone, e.nom_entite
            ORDER BY total DESC
            """,
            tuple([days] + zone_ids),
        )
 
    def get_secteurs_of_zone(self, zone_id: int) -> list[dict]:
        return fetch_all(
            "SELECT id_secteur FROM secteur WHERE id_zone = %s", (zone_id,)
        )
 
    def get_secteurs_of_entite(self, entite_id: int) -> list[dict]:
        return fetch_all(
            """
            SELECT s.id_secteur
            FROM secteur s
            JOIN zone z ON z.id_zone = s.id_zone
            WHERE z.id_entite = %s
            """,
            (entite_id,),
        )
 
    def get_zones_of_entite(self, entite_id: int) -> list[dict]:
        return fetch_all(
            "SELECT id_zone FROM zone WHERE id_entite = %s", (entite_id,)
        )
 
    def get_all_secteurs_ids(self) -> list[dict]:
        return fetch_all("SELECT id_secteur FROM secteur", ())
 
    def get_all_zone_ids(self) -> list[dict]:
        return fetch_all("SELECT id_zone FROM zone", ())
 
    def get_closure_rate(
        self, where_sql: str, where_params: tuple, days: int
    ) -> list[dict]:
        """Taux de clôture par entité/zone selon scope."""
        return fetch_all(
            f"""
            SELECT
                e.id_entite,
                e.nom_entite,
                COUNT(i.id_incident) AS total,
                SUM(CASE WHEN i.statut = 'CLOTURE' THEN 1 ELSE 0 END) AS clotures,
                ROUND(
                    100.0 * SUM(CASE WHEN i.statut = 'CLOTURE' THEN 1 ELSE 0 END)
                    / NULLIF(COUNT(i.id_incident), 0), 1
                ) AS taux_cloture
            FROM entite e
            JOIN zone z ON z.id_entite = e.id_entite
            JOIN secteur s ON s.id_zone = z.id_zone
            LEFT JOIN incident i ON i.id_secteur = s.id_secteur
                AND i.date_declaration >= DATE_SUB(NOW(), INTERVAL %s DAY)
            WHERE ({where_sql})
            GROUP BY e.id_entite, e.nom_entite
            ORDER BY taux_cloture DESC
            """,
            tuple([days, *where_params]),
        )
 
    def get_top_declarants_scoped(
        self, where_sql: str, where_params: tuple, days: int, limit: int
    ) -> list[dict]:
        """Top déclarants filtrés par scope."""
        return fetch_all(
            f"""
            SELECT
                u.id,
                CONCAT(COALESCE(u.prenom, ''), ' ', COALESCE(u.nom, '')) AS full_name,
                COUNT(i.id_incident) AS total_incidents,
                SUM(CASE WHEN i.gravite = 'CRITIQUE' THEN 1 ELSE 0 END) AS critiques,
                SUM(CASE WHEN i.gravite = 'GRAVE' THEN 1 ELSE 0 END) AS graves
            FROM utilisateur u
            INNER JOIN incident i ON i.id_declarant = u.id
            WHERE i.date_declaration >= DATE_SUB(NOW(), INTERVAL %s DAY)
              AND ({where_sql})
            GROUP BY u.id, u.nom, u.prenom
            ORDER BY total_incidents DESC
            LIMIT %s
            """,
            tuple([days, *where_params, limit]),
        )