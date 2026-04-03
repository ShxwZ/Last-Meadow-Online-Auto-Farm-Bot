# Autenticación en Discord con Playwright

## Configuración

Este proyecto está configurado para guardar y reutilizar la sesión de autenticación en Discord.

## Cómo funciona

1. **auth.setup.ts**: Este archivo se ejecuta primero y guarda tu sesión de Discord en `playwright/.auth/user.json`
2. **discord-authenticated.spec.ts**: Tests que usar la sesión guardada para ejecutar acciones autenticadas
3. **example.spec.ts**: Tests normales sin autenticación

## Pasos para usar

### Primera vez: Guardar la sesión

```bash
# Ejecutar solo el setup de autenticación
npx playwright test auth.setup.ts

# Se abrirá un navegador donde deberás iniciar sesión manualmente en Discord
# Una vez logueado, la sesión se guardará automáticamente
```

### Ejecutar tests con la sesión guardada

```bash
# Ejecutar todos los tests (usarán la sesión guardada)
npx playwright test

# O ejecutar solo los tests de Discord autenticado
npx playwright test discord-authenticated.spec.ts
```

### Limpiar la sesión

```bash
# Eliminar la sesión guardada
rm playwright/.auth/user.json

# O ejecutar nuevamente el setup para actualizar la sesión
npx playwright test auth.setup.ts
```

## Estructura del proyecto

```
tests/
├── auth.setup.ts                    # Setup que guarda la sesión
├── discord-authenticated.spec.ts    # Tests que usan la sesión
└── example.spec.ts                  # Tests normales

playwright/.auth/
└── user.json                        # Sesión guardada (NO COMMITEAR)
```

## Notas importantes

⚠️ **NUNCA** hagas commit del archivo `playwright/.auth/user.json` - contiene datos sensibles de tu sesión

El archivo ya está en `.gitignore` por seguridad.

## Customización

Si quieres automatizar el login en lugar de hacerlo manualmente, edita `auth.setup.ts` y usa tus credenciales:

```typescript
// Rellenar email
await page.fill('input[name="email"]', 'tu-email@example.com');

// Rellenar contraseña
await page.fill('input[name="password"]', 'tu-contraseña');

// Click en login
await page.click('button[type="submit"]');
```

⚠️ Asegúrate de NO hacerle commit a tus credenciales. Usa variables de entorno en su lugar.
