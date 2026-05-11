<?php

namespace App\Entity;

use App\Repository\CommentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use OpenApi\Attributes as OA;

#[ORM\Entity(repositoryClass: CommentRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[OA\Schema(
    schema: 'Comment',
    description: 'Comentario asociado a una incidencia'
)]
class Comment
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    #[OA\Property(property: 'id', type: 'string', format: 'uuid', description: 'UUID del comentario')]
    private ?string $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Incident $incident = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[OA\Property(property: 'author', type: 'string', description: 'Nombre del autor del comentario')]
    private ?User $author = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank(message: 'El comentario no puede estar vacío')]
    #[Assert\Length(
        min: 1,
        max: 2000,
        minMessage: 'El comentario debe tener al menos {{ limit }} carácter',
        maxMessage: 'El comentario no puede superar los {{ limit }} caracteres'
    )]
    #[OA\Property(property: 'content', type: 'string', maxLength: 2000, description: 'Contenido del comentario')]
    private ?string $content = null;

    #[ORM\Column]
    #[OA\Property(property: 'createdAt', type: 'string', format: 'date-time', description: 'Fecha de creación')]
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

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

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