# Aura Logic Site Audit

Auditor open source de sitemaps XML, canonical en HTML, hreflang en HTML y enlaces internos rotos. Primera versión en desarrollo; todavía no está publicado en npm ni tiene demo web.

## Empezar

Requiere Node.js 24 LTS o Node.js 22.22.1+.

```bash
npm ci
npm run build
node dist/cli.js https://example.com
node dist/cli.js https://example.com --json --output reports/audit.json
```

Descubre el sitemap desde `robots.txt` y rastrea enlaces del mismo origen. Cada hallazgo incluye código, gravedad, URL, explicación y, cuando corresponde, URL de destino.

Respeta `robots.txt`, limita las peticiones y marca los informes incompletos. No verifica enlaces externos ni ejecuta JavaScript. Tampoco comprueba la indexación real de Google. Consulta el [alcance](checks.md) antes de interpretar resultados.

## Contribuir

```bash
npm run check
npm run test:watch
```

Husky valida los archivos preparados para commit, commitlint exige Conventional Commits y el hook de push ejecuta los checks. Las contribuciones deben incluir evidencia o una prueba que reproduzca el problema. Consulta [CONTRIBUTING.md](../CONTRIBUTING.md).
