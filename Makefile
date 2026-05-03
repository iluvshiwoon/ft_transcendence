# ==============================================================================
# ft_transcendance — Makefile
# ==============================================================================

.PHONY: all up down build logs ps clean re help \
		ps-all shell-app shell-postgres \
		psql db-tables db-list \
		volumes volume-pg images prune \
		networks network-backend \
		logs-app logs-postgres logs-nginx

# Couleurs
RED		= \033[0;31m
GREEN	= \033[0;32m
YELLOW	= \033[1;33m
CYAN	= \033[0;36m
GRAY	= \033[0;37m
BOLD	= \033[1m
NC		= \033[0m

# ──────────────────────────────────────────
# CONTAINERS
# ──────────────────────────────────────────

up:
	podman-compose up -d

build:
	podman-compose up -d --build

down:
	podman-compose down

clean:
	podman-compose down -v

re: clean build

ps:
	podman-compose ps

ps-all:
	podman ps -a

shell-app:
	podman-compose exec app sh

shell-postgres:
	podman-compose exec postgres sh

# ──────────────────────────────────────────
# LOGS
# ──────────────────────────────────────────

logs:
	podman-compose logs -f

logs-app:
	podman-compose logs -f app

logs-postgres:
	podman-compose logs -f postgres

logs-nginx:
	podman-compose logs -f nginx

# ──────────────────────────────────────────
# BASE DE DONNÉES
# ──────────────────────────────────────────

psql:
	podman-compose exec postgres psql -U postgres_transcendance -d postgres_transcendance

db-tables:
	podman-compose exec postgres psql -U postgres_transcendance -d postgres_transcendance -c "\dt"

db-list:
	podman-compose exec postgres psql -U postgres_transcendance -c "\l"

# ──────────────────────────────────────────
# VOLUMES ET IMAGES
# ──────────────────────────────────────────

volumes:
	podman volume ls

volume-pg:
	podman volume inspect pgdata

images:
	podman images

prune:
	podman image prune -f

# ──────────────────────────────────────────
# RÉSEAU
# ──────────────────────────────────────────

networks:
	podman network ls

network-backend:
	podman network inspect backend

# ──────────────────────────────────────────
# AIDE
# ──────────────────────────────────────────

help:
	@echo ""
	@echo "$(BOLD)$(CYAN)╔════════════════════════════════════════╗$(NC)"
	@echo "$(BOLD)$(CYAN)║       ft_transcendance — Makefile      ║$(NC)"
	@echo "$(BOLD)$(CYAN)╚════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)  ── CONTAINERS ──────────────────────────────$(NC)"
	@echo "  $(GREEN)make build$(NC)            $(GRAY)→ Lancer avec rebuild$(NC)"
	@echo "  $(GREEN)make up$(NC)               $(GRAY)→ Lancer sans rebuild$(NC)"
	@echo "  $(GREEN)make down$(NC)             $(GRAY)→ Arrêter les containers$(NC)"
	@echo "  $(GREEN)make clean$(NC)            $(GRAY)→ Arrêter + supprimer les volumes$(NC)"
	@echo "  $(GREEN)make re$(NC)               $(GRAY)→ Reset complet + relancer$(NC)"
	@echo "  $(GREEN)make ps$(NC)               $(GRAY)→ État des containers actifs$(NC)"
	@echo "  $(GREEN)make ps-all$(NC)           $(GRAY)→ Tous les containers$(NC)"
	@echo "  $(GREEN)make shell-app$(NC)        $(GRAY)→ Shell dans le container app$(NC)"
	@echo "  $(GREEN)make shell-postgres$(NC)   $(GRAY)→ Shell dans le container postgres$(NC)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)  ── LOGS ────────────────────────────────────$(NC)"
	@echo "  $(GREEN)make logs$(NC)             $(GRAY)→ Logs de tous les containers$(NC)"
	@echo "  $(GREEN)make logs-app$(NC)         $(GRAY)→ Logs du container app$(NC)"
	@echo "  $(GREEN)make logs-postgres$(NC)    $(GRAY)→ Logs du container postgres$(NC)"
	@echo "  $(GREEN)make logs-nginx$(NC)       $(GRAY)→ Logs du container nginx$(NC)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)  ── BASE DE DONNÉES ─────────────────────────$(NC)"
	@echo "  $(GREEN)make psql$(NC)             $(GRAY)→ Se connecter à PostgreSQL$(NC)"
	@echo "  $(GREEN)make db-tables$(NC)        $(GRAY)→ Lister les tables$(NC)"
	@echo "  $(GREEN)make db-list$(NC)          $(GRAY)→ Lister les databases$(NC)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)  ── VOLUMES ET IMAGES ───────────────────────$(NC)"
	@echo "  $(GREEN)make volumes$(NC)          $(GRAY)→ Lister les volumes$(NC)"
	@echo "  $(GREEN)make volume-pg$(NC)        $(GRAY)→ Inspecter le volume postgres$(NC)"
	@echo "  $(GREEN)make images$(NC)           $(GRAY)→ Lister les images$(NC)"
	@echo "  $(GREEN)make prune$(NC)            $(GRAY)→ Supprimer les images inutilisées$(NC)"
	@echo ""
	@echo "$(BOLD)$(YELLOW)  ── RÉSEAU ──────────────────────────────────$(NC)"
	@echo "  $(GREEN)make networks$(NC)         $(GRAY)→ Lister les réseaux$(NC)"
	@echo "  $(GREEN)make network-backend$(NC)  $(GRAY)→ Inspecter le réseau backend$(NC)"
	@echo ""