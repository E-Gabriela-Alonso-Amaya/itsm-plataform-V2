<?php

namespace App\EventListener; //RUTA DE DONDE ESTÁ LA CLASE DENTRO DEL PROYECTO

use App\Entity\AuditLog;
use App\Entity\Incident;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Events;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Symfony\Bundle\SecurityBundle\Security;//SABER QUE USUARIO ESTÁ LOGEADO EN EL MOMENTO DEL CAMBIO

#[AsEntityListener(event: Events::preUpdate, entity: Incident::class)] // INFORMA A SYMFONY QUE EJECUTE ESTA CLASE ANTES DE QUE SE GUARDE CUALQUIER CAMBIO DE LA TABLA INCIDENTE EN LA BD
class IncidentAuditListener
{
    private const WATCHED_FIELDS = ['status', 'assignedTo', 'priority', 'category', 'title']; //CAMPOS_VIGILADOS, CUALQUIER CAMBIO GENERA UN REGISTRO EN LA TABLA audit_log

    public function __construct(
        private EntityManagerInterface $em, //$em:EntityManager -> GESTOR DE LA BD
        private Security $security
    ) {}


    public function preUpdate(Incident $incident, PreUpdateEventArgs $args): void //$args: ARGUMENTOS INF DE LAS MODIFICACIONES
    {
        $user = $this->security->getUser(); //USUARIO QUE REALIZO EL CAMBIO

        foreach (self::WATCHED_FIELDS as $field) { //$field: CAMPO   RECORRE LOS 5 CAMPOS VIGILADOS
            if (!$args->hasChangedField($field)) {
                continue;
            }

            $old = $args->getOldValue($field); //OBTIENE LOS DATOS ANTERIOR Y NUEVO
            $new = $args->getNewValue($field);

            $oldValue = $this->resolveValue($old); //LLAMA AL MÉTODO AUXILIAR 
            $newValue = $this->resolveValue($new);

    
            if ($oldValue === $newValue) { //COMPARAMOS SI LOS DATOS SON IGUALES PARA NO MODIFICARLOS SEGURIDAD EXTRA
                continue;
            }

            $log = new AuditLog(); //$log: REGISTRO CREA EL REGISTRO EN AUDITORIA
            $log->setIncident($incident);
            $log->setChangedBy($user instanceof \App\Entity\User ? $user : null);
            $log->setFieldChanged($field);
            $log->setOldValue($oldValue);
            $log->setNewValue($newValue);

            $this->em->persist($log);
        }
    }

    private function resolveValue(mixed $value): ?string //MÉTODO AUXILIAR CONVIERTE CUALQUIER VALOR A STRING
    {
        if ($value === null) {
            return null;
        }

        if (is_object($value) && method_exists($value, 'getName')) {
            return $value->getName();
        }

        return (string) $value;
    }
}