Npm (node package manager) : gestionnaire de paquets de Node.js.
Pnpm : version améliorée

Par défaut, pnpm installe les fichiers en pointant vers des liens symboliques qui renvoient vers 
les fichiers concernés. Le fichier node_module est alors composé uniquement de raccourcis. Lors de la copie 
vers le container, le fichier node_module se retrouve vide.
Pour forcer pnpm à intégrer les vrais fichiers, on utilise la commande "deploy". 

Le multistage permet d'alléger l'image finale de production en ne gardant que le nécéssaire.

Vault est un coffre-fort de secrets qui centralise le stockage et l'accès aux secrets. Il les protège avec 
du chiffrement, un contrôle d'accès granulaire* et un journal d'audit*.

*La gestion granulaire définit les permissions selon les rôles et besoins des utilisateurs -> sécurise les données 
en accordant le strict minimum à chaque service.
*Le journal d'audit est l'historique de toutes les actions effectuées par les utilisateurs -> possibilité de consulter 
les logs en cas de secrets compromis.

Par défaut, Vault démarre en état "sealed", à savoir scellé. En prod, il a besoin de 3 couches d'authentifications pour s'activer, ou utiliser l'auto-unseal pour déléguer cette tâche à un service tier (cloud, autre cluster vault, ou hsm). En mode dev, le root suffit.
Le Shamir's secret sharing permet également de déverouiller manuellement. Le concept : partager un mot de passe entre plusieurs personnes, dont un nombre minimum de parties serait requise pour l'authentification. 

"vault operator init -key-shares=? -key-threshold=?"
-key-shares = nombre de clés Shamir partagées.
-key-threshold = nombre minimum de clés Shamir requises.

ICP_LOCK : vérouille la mémoire de vault de sorte à ce que les secrets ne soient jamais inscrits sur le disque dur.

Le journal d'audit n'est pas activé par défaut.
On crée le répertoire de logs, on donne les droits d'user et de groupe à vault uniquement puis on active l'audit.

Le certificat TLS est activé par défaut lors de la définition du port TCP, d'où la nécéssité de le désac dans le fichier 
hcl. 

Un déploiement bare-metal = déploiement sur une machine sans couche de virtualisation

*** --- FONCTIONNEMENT DE VAULT --- ***



Sources :  

Container : 	https://podman.io/docs
				https://docs.docker.com/reference/dockerfile/
				https://docs.docker.com/reference/compose-file/
				https://blog.stephane-robert.info/docs/conteneurs/moteurs-conteneurs/podman/

Multistage : 	https://docs.docker.com/build/building/multi-stage/


Pnpm :      	https://pnpm.io/cli/install
				https://pnpm.io/workspaces
				https://pnpm.io/fr/docker

Compose :   	https://blog.stephane-robert.info/docs/conteneurs/orchestrateurs/docker-compose/
		
Postgres :      https://hub.docker.com/_/postgres
				https://www.postgresql.org/docs/current/app-pg-isready.html

Vault :         https://blog.stephane-robert.info/docs/securiser/secrets/hashicorp-vault/
				https://developer.hashicorp.com/vault/tutorials/get-started/setup
				https://developer.hashicorp.com/vault/docs/v1.20.x/configuration
				https://hub.docker.com/_/vault
				https://oneuptime.com/blog/post/2026-03-18-run-vault-podman-container/view
				https://une-tasse-de.cafe/blog/vault/
				https://korben.info/vault-consul-docker.html
				

Healthcheck :   https://docs.docker.com/reference/dockerfile/#healthcheck

!!! :           https://12factor.net/fr/

Script vault :  https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin
				https://www.gnu.org/software/bash/manual/bash.html#Shell-Parameter-Expansion
				https://blog.stephane-robert.info/docs/admin-serveurs/linux/references/jq/
				https://korben.info/vault-consul-docker.html

PGP :			https://www.fortinet.com/fr/resources/cyberglossary/pgp-encryption#:~:text=Pretty%20Good%20Privacy%20(PGP)%20est,Paul%20Zimmerman%2C%20un%20militant%20politique.




			
