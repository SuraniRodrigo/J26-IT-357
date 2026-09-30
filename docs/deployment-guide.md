# Deployment guide

## Local development

Use Docker Compose for the full stack:

```bash
docker compose up --build
```

## Production notes

- Keep environment variables outside the repository.
- Use managed PostgreSQL in deployment environments.
- Load model artifacts from the production artifact store rather than training directories.
- Restrict API access with authentication and authorization where required.
