<?php

namespace App\EventSubscriber;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class CompanyFilterSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private Security $security
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => [['onKernelRequest', 5]],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if ($request->isMethod('OPTIONS')) {
            return;
        }

        $selectedCompanyId = $request->headers->get('X-Company-Id');
        
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return;
        }

        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());

        // Si es administrador
        if ($isAdmin) {
            if ($selectedCompanyId && $selectedCompanyId !== 'global') {
                // Activamos el filtro para la empresa seleccionada
                $filter = $this->em->getFilters()->enable('company_filter');
                $filter->setParameter('company_ids', $selectedCompanyId);
            } else {
                // Si no hay empresa seleccionada o es 'global', ve todo
                $this->em->getFilters()->disable('company_filter');
            }
            return;
        }

        // Para usuarios normales (Agentes/Empleados), el filtro SIEMPRE está activo
        $filter = $this->em->getFilters()->enable('company_filter');
        
        // Si el usuario normal envía una cabecera, verificamos que pertenezca a esa empresa
        if ($selectedCompanyId && $selectedCompanyId !== 'global') {
            $userCompanies = [];
            foreach ($user->getCompanies() as $company) {
                $userCompanies[] = $company->getId()->toRfc4122();
            }

            if (in_array($selectedCompanyId, $userCompanies)) {
                $filter->setParameter('company_ids', $selectedCompanyId);
                return;
            }
            // Si intenta acceder a una empresa que no es suya, ignoramos la cabecera 
            // y aplicamos el filtro con todas sus empresas autorizadas.
        }

        $companyIds = [];
        foreach ($user->getCompanies() as $company) {
            $companyIds[] = $company->getId()->toRfc4122();
        }

        if (empty($companyIds)) {
            $filter->setParameter('company_ids', '00000000-0000-0000-0000-000000000000');
        } else {
            $filter->setParameter('company_ids', implode(',', $companyIds));
        }
    }
}
