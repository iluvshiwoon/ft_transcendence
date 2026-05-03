up:
	podman-compose up -d

build:
	podman-compose up -d --build

down:
	podman-compose down

clean:
	podman-compose down -v

re: clean build

logs:
	podman-compose logs -f

logs-app:
	podman logs -f app

logs-postgres:
	podman logs -f postgres

logs-nginx:
	podman logs -f nginx

ps:
	podman-compose ps

# Aide
help:
	@echo ""
	@echo "  make build        → Lancer tous les containers avec rebuild"
	@echo "  make up           → Lancer tous les containers sans rebuild"
	@echo "  make down         → Arrêter tous les containers"
	@echo "  make clean        → Arrêter et supprimer les volumes (reset BDD)"
	@echo "  make re           → Reset complet + relancer"
	@echo "  make logs         → Voir les logs de tous les containers"
	@echo "  make logs-app     → Logs du container app"
	@echo "  make logs-postgres→ Logs du container postgres"
	@echo "  make logs-nginx   → Logs du container nginx"
	@echo "  make ps           → État des containers"
	@echo ""

.PHONY: all up down build logs ps clean re help