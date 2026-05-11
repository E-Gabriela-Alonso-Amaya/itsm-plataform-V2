<?php

namespace App\Entity;

use App\Repository\AuditLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AuditLogRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[OA\Schema(
    schema: 'AuditLog',
    description: 'Registro de cambios realizados sobre una incidencia'
)]
class AuditLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[OA\Property(property: 'id', type: 'string', format: 'uuid', description: 'UUID del registro')]
    private ?string $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Incident $incident = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    #[OA\Property(property: 'changedBy', type: 'string', nullable: true, description: 'Nombre del usuario que realizó el cambio')]
    private ?User $changedBy = null;

    #[ORM\Column(length: 100)]
    #[OA\Property(property: 'fieldChanged', type: 'string', maxLength: 100, description: 'Campo que fue modificado', example: 'status')]
    private ?string $fieldChanged = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[OA\Property(property: 'oldValue', type: 'string', nullable: true, description: 'Valor anterior del campo', example: 'Nuevo')]
    private ?string $oldValue = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[OA\Property(property: 'newValue', type: 'string', nullable: true, description: 'Nuevo valor del campo', example: 'En Proceso')]
    private ?string $newValue = null;

    #[ORM\Column]
    #[OA\Property(property: 'createdAt', type: 'string', format: 'date-time', description: 'Fecha del cambio')]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getIncident(): ?Incident
    {
        return $this->incident;
    }

    public function setIncident(?Incident $incident): static
    {
        $this->incident = $incident;

        return $this;
    }

    public function getChangedBy(): ?User
    {
        return $this->changedBy;
    }

    public function setChangedBy(?User $changedBy): static
    {
        $this->changedBy = $changedBy;

        return $this;
    }

    public function getFieldChanged(): ?string
    {
        return $this->fieldChanged;
    }

    public function setFieldChanged(string $fieldChanged): static
    {
        $this->fieldChanged = $fieldChanged;

        return $this;
    }

    public function getOldValue(): ?string
    {
        return $this->oldValue;
    }

    public function setOldValue(?string $oldValue): static
    {
        $this->oldValue = $oldValue;

        return $this;
    }

    public function getNewValue(): ?string
    {
        return $this->newValue;
    }

    public function setNewValue(?string $newValue): static
    {
        $this->newValue = $newValue;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}