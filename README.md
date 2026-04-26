# HSE Gestion

## Run Locally

**Prerequisites:** Node.js, MySQL/MariaDB running on port `3306`

1. Install dependencies:
   `npm install`
2. Import your SQL schema:
   `mysql -u root -p < c:\Users\dell\Downloads\gestion_hse.sql`
3. Create `.env.local` from `.env.example` and set DB credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
4. Start the API server:
   `python run.py`
5. In another terminal, start the frontend:
   `npm run dev`

## Project Structure

- `frontend/`: Vite + React client code
- `backen/`: FastAPI (Python) API code


