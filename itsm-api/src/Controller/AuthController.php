<?php

namespace App\Controller; //AUTENTICACIÓN

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\User;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Autenticación', description: 'Endpoints de login, sesión y refresco de token')]
#[Route('/api/auth', name: 'auth_')] //prefijo común para todos los endpoints de autenticación para no repetir la ruta en cada metodo
final class AuthController extends AbstractController
{
    #[Route('/login', name: 'login', methods: ['POST'])]
    #[OA\Post(
        path: '/api/auth/login',
        operationId: 'authLogin',
        description: 'Valida las credenciales del usuario y devuelve un token JWT con TTL de 1 hora.',
        summary: 'Iniciar sesión',
        requestBody: new OA\RequestBody(
            description: 'Credenciales del usuario',
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', description: 'Email del usuario', type: 'string', format: 'email', example: 'empleado@itsm.com'),
                    new OA\Property(property: 'password', description: 'Contraseña del usuario', type: 'string', format: 'password', example: 'Empleado1234'),
                ]
            )
        ),
        tags: ['Autenticación'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Login correcto — devuelve token JWT y datos del usuario',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', description: 'Token JWT', type: 'string', example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'),
                        new OA\Property(
                            property: 'user',
                            description: 'Datos del usuario autenticado',
                            properties: [
                                new OA\Property(property: 'id', description: 'UUID del usuario', type: 'string', format: 'uuid'),
                                new OA\Property(property: 'email', description: 'Email del usuario', type: 'string', example: 'empleado@itsm.com'),
                                new OA\Property(property: 'name', description: 'Nombre completo', type: 'string', example: 'Juan García'),
                                new OA\Property(property: 'roles', description: 'Roles asignados', type: 'array', items: new OA\Items(type: 'string', example: 'ROLE_USER')),
                            ],
                            type: 'object'
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 401,
                description: 'Credenciales incorrectas',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', description: 'Mensaje de error', type: 'string', example: 'Credenciales incorrectas'),
                    ]
                )
            ),
        ]
    )]
    public function login(
        #[CurrentUser] ?User $user,
        Request $request,
        LoggerInterface $securityLogger
    ): JsonResponse {
        if (null === $user) {
            $securityLogger->warning('Login fallido', [
                'ip'    => $request->getClientIp(),
                'email' => $request->toArray()['email'] ?? 'desconocido',
            ]);
            return $this->json([
                'message' => 'Credenciales incorrectas',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $securityLogger->info('Login exitoso', [
            'ip'    => $request->getClientIp(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
        ]);

        return $this->json([
            'user' => [
                'id'         => $user->getId(),
                'email'      => $user->getEmail(),
                'name'       => $user->getName(),
                'roles'      => $user->getRoles(),
                'categories' => $user->getCategories()->map(fn($c) => [
                    'id'   => $c->getId(),
                    'name' => $c->getName()
                ])->toArray(),
                'companies' => $user->getCompanies()->map(fn($c) => [
                    'id'   => $c->getId(),
                    'name' => $c->getName()
                ])->toArray(),
            ],
        ]);
    }

    //Este endpoint es muy útil para el frontend. Cuando Angular o Ionic arrancan, necesitan saber quién es el usuario del
    // token JWT guardado. En lugar de decodificar el token en el cliente, hacen una petición a `/api/auth/me` con el token
    // y reciben los datos actualizados del usuario directamente de la base de datos.
    #[Route('/me', name: 'me', methods: ['GET'])] //CONSULTA SOLO QUIEN ES EL USUARIO LOGEADO
    #[OA\Get(
        path: '/api/auth/me',
        operationId: 'authMe',
        description: 'Devuelve el perfil completo del usuario propietario del token JWT.',
        summary: 'Obtener usuario autenticado',
        security: [['bearerAuth' => []]],
        tags: ['Autenticación'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Datos del usuario autenticado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'user',
                            description: 'Perfil completo del usuario',
                            properties: [
                                new OA\Property(property: 'id', description: 'UUID del usuario', type: 'string', format: 'uuid'),
                                new OA\Property(property: 'email', description: 'Email del usuario', type: 'string', example: 'empleado@itsm.com'),
                                new OA\Property(property: 'name', description: 'Nombre completo', type: 'string', example: 'Juan García'),
                                new OA\Property(property: 'roles', description: 'Roles asignados', type: 'array', items: new OA\Items(type: 'string')),
                                new OA\Property(property: 'isActive', description: 'Si la cuenta está activa', type: 'boolean', example: true),
                                new OA\Property(property: 'createdAt', description: 'Fecha de registro', type: 'string', format: 'date-time', example: '2026-03-10 09:00:00'),
                            ],
                            type: 'object'
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 401,
                description: 'Token ausente o inválido',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', description: 'Mensaje de error', type: 'string', example: 'Usuario no autenticado'),
                    ]
                )
            ),
        ]
    )]
    public function me(#[CurrentUser] ?User $user): JsonResponse
    {
        if (null === $user) {
            return $this->json([
                'message' => 'Usuario no autenticado',
            ], JsonResponse::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'user' => [
                'id'        => $user->getId(),
                'email'     => $user->getEmail(),
                'name'      => $user->getName(),
                'roles'     => $user->getRoles(),
                'isActive'  => $user->isActive(),
                'createdAt' => $user->getCreatedAt()?->format('Y-m-d H:i:s'),
                'categories' => $user->getCategories()->map(fn($c) => [
                    'id'   => $c->getId(),
                    'name' => $c->getName()
                ])->toArray(),
                'companies' => $user->getCompanies()->map(fn($c) => [
                    'id'   => $c->getId(),
                    'name' => $c->getName()
                ])->toArray(),
            ]
        ]);
    }

    #[Route('/refresh', name: 'refresh', methods: ['POST'])]
    #[OA\Post(
        path: '/api/auth/refresh',
        operationId: 'authRefresh',
        description: 'Placeholder — implementación completa con rotación de refresh token prevista en Fase VI.',
        summary: 'Refrescar token JWT',
        security: [['bearerAuth' => []]],
        tags: ['Autenticación'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mensaje informativo — endpoint aún no implementado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', description: 'Mensaje informativo', type: 'string', example: 'Utilizar el refresh token para obtener un nuevo token'),
                    ]
                )
            ),
        ]
    )]
    public function refresh(): JsonResponse
    {
        return $this->json([
            'message' => 'Utilizar el refresh token para obtener un nuevo token',
        ], JsonResponse::HTTP_OK);
    }
}