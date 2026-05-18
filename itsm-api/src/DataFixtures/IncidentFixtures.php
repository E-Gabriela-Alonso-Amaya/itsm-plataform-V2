<?php

namespace App\DataFixtures;

use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\Company;
use App\Entity\Incident;
use App\Entity\Priority;
use App\Entity\Status;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class IncidentFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // 1. Obtener los usuarios de UserFixtures
        $admin = $manager->getRepository(User::class)->findOneBy(['email' => 'admin@email.com']);
        $agent1 = $manager->getRepository(User::class)->findOneBy(['email' => 'agente01@email.com']);
        $agent2 = $manager->getRepository(User::class)->findOneBy(['email' => 'agente02@email.com']);
        $user1 = $manager->getRepository(User::class)->findOneBy(['email' => 'user.alpha@email.com']);
        $user2 = $manager->getRepository(User::class)->findOneBy(['email' => 'user.beta@email.com']);

        if (!$admin || !$agent1 || !$agent2 || !$user1 || !$user2) {
            throw new \RuntimeException('Debe cargar UserFixtures primero para poblar los usuarios.');
        }

        // 2. Crear Empresas si no existen
        $companyAlpha = $manager->getRepository(Company::class)->findOneBy(['name' => 'Alpha']) 
            ?? (new Company())->setName('Alpha')->setIsActive(true);
        $companyBeta = $manager->getRepository(Company::class)->findOneBy(['name' => 'Beta'])
            ?? (new Company())->setName('Beta')->setIsActive(true);

        $manager->persist($companyAlpha);
        $manager->persist($companyBeta);

        // Asociar empresas a los empleados
        $user1->addCompany($companyAlpha);
        $user2->addCompany($companyBeta);
        $manager->persist($user1);
        $manager->persist($user2);

        // 3. Crear Estados
        $statusMap = [];
        $statusesData = [
            ['name' => 'Nuevo', 'isDefault' => true, 'isClosed' => false, 'sort' => 1],
            ['name' => 'Asignado', 'isDefault' => false, 'isClosed' => false, 'sort' => 2],
            ['name' => 'En Proceso', 'isDefault' => false, 'isClosed' => false, 'sort' => 3],
            ['name' => 'Resuelto', 'isDefault' => false, 'isClosed' => true, 'sort' => 4],
            ['name' => 'Cerrado', 'isDefault' => false, 'isClosed' => true, 'sort' => 5],
        ];

        foreach ($statusesData as $data) {
            $status = $manager->getRepository(Status::class)->findOneBy(['name' => $data['name']]);
            if (!$status) {
                $status = new Status();
                $status->setName($data['name'])
                       ->setIsDefault($data['isDefault'])
                       ->setIsClosed($data['isClosed'])
                       ->setSortOrder($data['sort'])
                       ->setIsActive(true);
                $manager->persist($status);
            }
            $statusMap[$data['name']] = $status;
        }

        // 4. Crear Prioridades
        $priorityMap = [];
        $prioritiesData = [
            ['name' => 'Baja', 'sla' => 24, 'sort' => 1],
            ['name' => 'Media', 'sla' => 8, 'sort' => 2],
            ['name' => 'Alta', 'sla' => 4, 'sort' => 3],
            ['name' => 'Crítica', 'sla' => 2, 'sort' => 4],
        ];

        foreach ($prioritiesData as $data) {
            $priority = $manager->getRepository(Priority::class)->findOneBy(['name' => $data['name']]);
            if (!$priority) {
                $priority = new Priority();
                $priority->setName($data['name'])
                         ->setSlaHours($data['sla'])
                         ->setSortOrder($data['sort'])
                         ->setIsActive(true);
                $manager->persist($priority);
            }
            $priorityMap[$data['name']] = $priority;
        }

        // 5. Crear Categorías
        $categoryMap = [];
        $categoriesData = [
            ['name' => 'Soporte Técnico', 'sort' => 1],
            ['name' => 'Hardware', 'sort' => 2],
            ['name' => 'Software', 'sort' => 3],
            ['name' => 'Redes y Conectividad', 'sort' => 4],
            ['name' => 'Accesos y Seguridad', 'sort' => 5],
        ];

        foreach ($categoriesData as $data) {
            $category = $manager->getRepository(Category::class)->findOneBy(['name' => $data['name']]);
            if (!$category) {
                $category = new Category();
                $category->setName($data['name'])
                         ->setSortOrder($data['sort'])
                         ->setIsActive(true);
                $manager->persist($category);
            }
            $categoryMap[$data['name']] = $category;
        }

        // Forzar flush para tener IDs de relaciones listos si los pre-existentes fueron persistidos
        $manager->flush();

        // 6. Crear Incidencias (Tickets) — varias por empresa a lo largo de la última semana
        $now = new \DateTimeImmutable();

        $companies = [$companyAlpha, $companyBeta];
        $agents = [$agent1, $agent2];
        $categoryList = array_values($categoryMap);
        $priorityList = array_values($priorityMap);

        // Para cada empresa, generamos una incidencia por día durante los últimos 7 días
        foreach ($companies as $cIndex => $company) {
            $owner = $cIndex === 0 ? $user1 : $user2;
            for ($day = 6; $day >= 0; $day--) {
                $hourOffset = rand(8, 18);
                $createdAt = $now->modify("-{$day} days -{$hourOffset} hours");

                $cat = $categoryList[($day + $cIndex) % count($categoryList)];
                $pri = $priorityList[($day + $cIndex) % count($priorityList)];
                $agent = $agents[($day + $cIndex) % count($agents)];

                $inc = new Incident();
                $inc->setTitle(sprintf('[%s] Incidencia generada el %s', $company->getName(), $createdAt->format('d/m')))
                    ->setDescription('Incidencia de demostración para la empresa '.$company->getName()." en la fecha " . $createdAt->format('Y-m-d H:i'))
                    ->setCategory($cat)
                    ->setPriority($pri)
                    ->setReportedBy($owner)
                    ->setCompany($company)
                    ->setCreatedAt($createdAt)
                    ->setUpdatedAt($createdAt);

                // Simular ciclo: asignada -> en proceso -> resuelta (dentro del SLA)
                $assignedAt = $createdAt->modify('+1 hour');
                $startedAt = $assignedAt->modify('+15 minutes');

                // Asegurar resolución dentro del SLA: usamos la SLA de la prioridad y resolvemos antes
                $slaHours = max(1, (int) $pri->getSlaHours());
                $resolveOffsetHours = max(1, (int) ceil($slaHours * 0.6));
                $resolvedAt = $startedAt->modify('+'. $resolveOffsetHours .' hours');

                $inc->setAssignedTo($agent)
                    ->setAssignedAt($assignedAt)
                    ->setStartedAt($startedAt)
                    ->setResolvedAt($resolvedAt)
                    ->setUpdatedAt($resolvedAt)
                    ->setStatus($statusMap['Resuelto'])
                    ->setRating(4 + ($day % 2)); // alterna 4/5 estrellas

                $manager->persist($inc);

                // Comentarios: empleado inicia conversación, técnico responde, técnico cierra
                $c1 = (new Comment())
                    ->setIncident($inc)
                    ->setAuthor($owner)
                    ->setContent('Reporte inicial: descripción detallada del problema.')
                    ->setCreatedAt($createdAt);
                $manager->persist($c1);

                $c2 = (new Comment())
                    ->setIncident($inc)
                    ->setAuthor($agent)
                    ->setContent('Técnico: tomo el caso, reviso logs y aplico la corrección remota.')
                    ->setCreatedAt($assignedAt);
                $manager->persist($c2);

                $c3 = (new Comment())
                    ->setIncident($inc)
                    ->setAuthor($agent)
                    ->setContent('Técnico: incidencia resuelta. Compruebe y confirme por favor.')
                    ->setCreatedAt($resolvedAt);
                $manager->persist($c3);
            }
        }

        // Flush final de todas las incidencias y comentarios
        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            UserFixtures::class,
        ];
    }
}
