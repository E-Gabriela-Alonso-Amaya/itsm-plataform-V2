<?php

namespace App\Controller;

use App\Entity\User as AppUser;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Usuarios', description: 'Perfil y gestión de usuarios')]
#[Route('/api/users', name: 'user_')]
class UserController extends AbstractController
{
    // ─── Obtener lista de todos los usuarios (para Admin) ─────────────────────
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(UserRepository $userRepository): JsonResponse
    {
        /** @var AppUser $user */
        $user = $this->getUser();
        if (!in_array('ROLE_ADMIN', $user->getRoles())) {
            return $this->json(['error' => 'Solo administradores'], 403);
        }

        $users = $userRepository->findAll();
        return $this->json(array_map(fn($u) => [
            'id'    => (string)$u->getId(),
            'name'  => $u->getName(),
            'email' => $u->getEmail(),
            'roles' => $u->getRoles(),
            'isActive' => $u->isActive(),
            'companies' => array_values(array_map(fn($c) => ['id' => (string)$c->getId(), 'name' => $c->getName()], $u->getCompanies()->toArray())),
        ], $users));
    }

    // ─── Obtener lista de agentes (para que admin pueda asignar) ─────────────
    #[Route('/agents', name: 'agents', methods: ['GET'])]
    public function agents(UserRepository $userRepository): JsonResponse
    {
        /** @var AppUser $user */
        $user = $this->getUser();

        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
            return $this->json(['error' => 'No autorizado'], 403);
        }

        $agents = $userRepository->findAll();
        $data = array_filter($agents, fn($u) =>
            in_array('ROLE_AGENT', $u->getRoles()) || in_array('ROLE_ADMIN', $u->getRoles())
        );

        return $this->json(array_values(array_map(fn($u) => [
            'id'    => (string)$u->getId(),
            'name'  => $u->getName(),
            'email' => $u->getEmail(),
            'roles' => $u->getRoles(),
            'companies' => array_values(array_map(fn($c) => ['id' => (string)$c->getId(), 'name' => $c->getName()], $u->getCompanies()->toArray())),
        ], $data)));
    }

    // ─── Cambiar contraseña ───────────────────────────────────────────────────
    #[Route('/me/password', name: 'change_password', methods: ['PATCH'])]
    public function changePassword(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        /** @var AppUser $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);
        $currentPassword = $data['currentPassword'] ?? null;
        $newPassword     = $data['newPassword'] ?? null;

        if (!$currentPassword || !$newPassword) {
            return $this->json(['error' => 'Faltan campos obligatorios'], 400);
        }

        if (!$hasher->isPasswordValid($user, $currentPassword)) {
            return $this->json(['error' => 'Contraseña actual incorrecta'], 400);
        }

        if (strlen($newPassword) < 8) {
            return $this->json(['error' => 'La nueva contraseña debe tener al menos 8 caracteres'], 400);
        }

        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $em->flush();

        return $this->json(['message' => 'Contraseña actualizada correctamente']);
    }

    // ─── Actualizar perfil (nombre + foto) ───────────────────────────────────
    #[Route('/me/profile', name: 'update_profile', methods: ['PATCH', 'POST'])]
    public function updateProfile(
        Request $request,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var AppUser $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'No autenticado'], 401);
        }

        // Soporte multipart/form-data y JSON
        $name = $request->request->get('name') ?? (json_decode($request->getContent(), true)['name'] ?? null);

        if ($name !== null && trim($name) !== '') {
            $user->setName(trim($name));
        }

        // Subida de foto de perfil
        $photo = $request->files->get('photo');
        if ($photo) {
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($photo->getMimeType(), $allowedMimes, true)) {
                return $this->json(['error' => 'Tipo de imagen no permitido'], 422);
            }
            if ($photo->getSize() > 5 * 1024 * 1024) {
                return $this->json(['error' => 'La imagen supera los 5 MB'], 422);
            }

            $filename = 'avatar_' . $user->getId() . '_' . time() . '.' . $photo->guessExtension();
            $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars';

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $photo->move($uploadDir, $filename);
            // Guardar URL relativa si el campo existe en la entidad
            if (method_exists($user, 'setAvatarUrl')) {
                $user->setAvatarUrl('/uploads/avatars/' . $filename);
            }
        }

        $em->flush();

        return $this->json([
            'id'        => (string)$user->getId(),
            'name'      => $user->getName(),
            'email'     => $user->getEmail(),
            'roles'     => $user->getRoles(),
            'isActive'  => $user->isActive(),
        ]);
    }
}