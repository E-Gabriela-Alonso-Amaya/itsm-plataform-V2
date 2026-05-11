<?php

namespace App\Doctrine;

use App\Entity\Incident;
use App\Entity\Company;
use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\Filter\SQLFilter;

class CompanyFilter extends SQLFilter
{
    public function addFilterConstraint(ClassMetadata $targetEntity, $targetTableAlias): string
    {
        // Solo filtramos si la entidad tiene relación con Company
        if (!$targetEntity->hasAssociation('company')) {
            return '';
        }

        // Recuperamos los IDs de las empresas permitidas desde el parámetro
        try {
            $companyIds = $this->getParameter('company_ids');
        } catch (\InvalidArgumentException $e) {
            return '';
        }

        if (!$companyIds) {
            return '';
        }

        // El parámetro viene entrecomillado por Doctrine, lo limpiamos
        $cleanIds = trim($companyIds, "'");
        $ids = explode(',', $cleanIds);
        
        // Convertimos cada UUID string a binario usando la función de MySQL 8
        $binIds = array_map(fn($id) => "UUID_TO_BIN('" . trim($id) . "')", $ids);

        return sprintf('%s.company_id IN (%s)', $targetTableAlias, implode(',', $binIds));
    }
}
