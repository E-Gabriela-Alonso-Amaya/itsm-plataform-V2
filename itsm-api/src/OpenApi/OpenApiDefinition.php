<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    description: 'API REST del sistema de gestión de incidencias internas',
    title: 'ITSM Helpdesk API'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    description: 'Token JWT obtenido en /api/auth/login',
    bearerFormat: 'JWT',
    scheme: 'bearer'
)]
#[OA\Server(url: 'http://127.0.0.1:8000', description: 'Servidor local')]
class OpenApiDefinition
{
}