<?php

namespace App\EventSubscriber;

use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

class ExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(private LoggerInterface $logger) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', 10],
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request   = $event->getRequest();

        // Solo interceptar rutas /api
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $statusCode = $exception instanceof HttpExceptionInterface
            ? $exception->getStatusCode()
            : 500;

        if ($statusCode >= 500) { // Log de errores 500 — no deben revelar detalles al cliente OWASP A10
            $this->logger->error('Error interno', [
                'message' => $exception->getMessage(),
                'file'    => $exception->getFile(),
                'line'    => $exception->getLine(),
                'path'    => $request->getPathInfo(),
            ]);
        }

        // Mensaje genérico para error 500 — nunca debe exponer stack trace u otros detalles sensibles al cliente
        $message = $statusCode >= 500
            ? 'Error interno del servidor'
            : $exception->getMessage();

        $event->setResponse(new JsonResponse(
            ['error' => $message],
            $statusCode
        ));
    }
}