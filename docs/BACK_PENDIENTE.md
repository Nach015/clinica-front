# Contrato de integración del backend (SCRUM-36 y SCRUM-37)

El front de **Urgencias** usa `POST /api/cola` para registrar una urgencia y
`GET /api/cola?estado=esperando` para mostrar la cola. El backend ahora acepta
ese contrato: recepción/admin envían `paciente`, `prioridad=10` y `nota`; el
paciente no puede asignar prioridades ni anotar a otra persona.

El resto de esta página conserva los criterios de validación y formato de error
que deben mantenerse al cambiar los endpoints.

> Recordatorio: la validación del front solo ayuda al usuario. **La que protege el
> sistema es la del back**, que tiene que revisar todo de nuevo.

## 1. Alta de urgencia (SCRUM-36)

El front manda esto desde recepción / admin:

```http
POST /api/cola
Authorization: Bearer <token del personal>

{
  "paciente": "<uuid del paciente>",
  "especialidad": 3,
  "nota": "Dolor de pecho desde hace 30 minutos",
  "prioridad": 10
}
```

Hoy ese `POST /api/cola` lo usa el **paciente** para anotarse a sí mismo (manda solo
`especialidad`). Lo que hay que agregar:

| Regla | Detalle |
|---|---|
| Personal (recepción / admin) | Puede mandar `paciente` y `prioridad`. Si no manda `prioridad`, queda normal (0). |
| Paciente | **Ignora o rechaza** `prioridad` y `paciente`: nunca puede marcarse a sí mismo como urgente ni anotar a otro. |
| `prioridad` | `10` = urgencia. Cualquier valor `>= 10` cuenta como urgente (así lo interpreta el front). |
| `nota` | Obligatoria para urgencias, entre 5 y 200 caracteres. |
| `paciente` | Tiene que existir y ser de rol paciente → si no, `400` con `errors.paciente`. |
| Duplicado | Si el paciente ya está `esperando` en esa especialidad, responder `409` con un `detail` claro. |
| Respuesta | `201` con la entrada completa (`EntradaCola`, ver `types.ts`). |

El listado `GET /api/cola?estado=esperando` ya devuelve las urgentes primero; el
front igual reordena por antigüedad dentro de las urgentes.

Ya existentes y que el front usa tal cual: `PATCH /api/cola/<id>/prioridad`
(bajar a normal), `POST /api/cola/<id>/agendar` (asignar horario),
`DELETE /api/cola/<id>` (descartar) y `GET /api/disponibilidad` (para buscar el
primer horario libre).

## 2. Formato de errores (SCRUM-37)

El front entiende estas respuestas; mantenerlas igual en todos los endpoints:

```json
{ "code": "invalid", "detail": "Mensaje para mostrar." }
{ "code": "invalid", "errors": { "email": ["Ya existe una cuenta con ese email."] } }
```

- `errors` usa los **mismos nombres de campo** que el body que se mandó. Así el
  front pinta el mensaje debajo del campo correcto.
- Los `5xx` no deben filtrar trazas al cliente (el front igual las oculta).
- El `429` de throttling lleva `"code": "throttled"`.
- Un `401` en `/api/auth/login` significa "credenciales incorrectas", no "sesión
  vencida" (el front ya lo trata así).

## 3. Validaciones que el back debería repetir

Las mismas reglas que aplica el front (ver `src/lib/validaciones.ts`):

| Campo | Regla |
|---|---|
| Email | formato válido, máx. 254 |
| Nombre | 2 a 100 caracteres, solo letras, espacios, `'`, `.` y `-` |
| Teléfono | opcional; 8 a 15 dígitos |
| Contraseña | 8 a 128 caracteres, no solo números |
| Código de verificación | exactamente 6 dígitos |
| Matrícula | 3 a 64 caracteres: letras, números, `.`, `/`, `-` |
| Duración de especialidad | entero entre 10 y 240, múltiplo de 5 |
| Tramo de agenda | `hora_fin` posterior a `hora_inicio` |
| Turno | `inicio` no puede estar en el pasado |
| Ficha médica | `alergias` y `enfermedades_cronicas` obligatorias (máx. 500) |
| Consulta | 5 a 1000 caracteres; respuesta de 3 a 2000 |
| Motivo de turno | máx. 200 |
