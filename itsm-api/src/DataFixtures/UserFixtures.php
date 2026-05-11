<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $hasher
    ) {}

    public function load(ObjectManager $manager): void
    {
        $admin = new User();
        $admin->setEmail('admin@email.com');
        $admin->setName('Administrador');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setIsActive(true);
        $admin->setPassword(
            $this->hasher->hashPassword($admin, 'a1234')
        );
        $manager->persist($admin);

        $agent1 = new User();
        $agent1->setEmail('agente01@email.com');
        $agent1->setName('Técnico de Soporte 01');
        $agent1->setRoles(['ROLE_AGENT']);
        $agent1->setIsActive(true);
        $agent1->setPassword(
            $this->hasher->hashPassword($agent1, 'ag1234')
        );
        $manager->persist($agent1);

        $agent2 = new User();
        $agent2->setEmail('agente02@email.com');
        $agent2->setName('Técnico de Soporte 02');
        $agent2->setRoles(['ROLE_AGENT']);
        $agent2->setIsActive(true);
        $agent2->setPassword(
            $this->hasher->hashPassword($agent2, 'ag1234')
        );
        $manager->persist($agent2);

        $user1 = new User();
        $user1->setEmail('empleado01@email.com');
        $user1->setName('Empleado 01');
        $user1->setRoles([]);
        $user1->setIsActive(true);
        $user1->setPassword(
            $this->hasher->hashPassword($user1, 'e1234')
        );
        $manager->persist($user1);

        $user2 = new User();
        $user2->setEmail('empleado02@email.com');
        $user2->setName('Empleado 02');
        $user2->setRoles([]);
        $user2->setIsActive(true);
        $user2->setPassword(
            $this->hasher->hashPassword($user2, 'e1234')
        );
        $manager->persist($user2);

        $manager->flush();
    }
}