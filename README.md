# VAULT — casino virtuel hors ligne

Jeu mobile (PWA, interface verticale) façon casino crypto : **100 % virtuel, aucun argent réel**, contre des IA.

**Jouer :** https://sucrayyyy.github.io/vault-casino/ — sur iPhone, ouvrir dans Safari → Partager → *Sur l’écran d’accueil*.

## Contenu
- **Vault Originals** : Dice, Mines, Limbo, Plinko, Hilo, Keno, Jet (crash), Poulet Express, Roue, Tour du Dragon, Fruit Vault (machine à sous)
- **Jeux de table** : Blackjack (3:2, split, double), Roulette européenne
- **CS Skins** : 20 vraies caisses CS2 (contenus, images Steam et prix Skinport réels, StatTrak, usures/float), Upgrader (curseur de chance, sous/dessus, enchaînement), Case Battles contre l’IA (1v1 → 2v2, mode Crazy)
- **Pokémon TCG** : 26 extensions françaises de 1999 à 2025 (vraies cartes TCGdex, prix Cardmarket), taux de tirage par époque, secrètes/gold/SIR, boosters, ETB, displays, scellés qui prennent de la valeur, classeur à compléter, revente, gradation
- **Deux modes** : Histoire (100 jetons, 15 chapitres, déblocages par paliers de fortune) et Bac à sable
- **Rétention** : bonus quotidien (série 7 jours), coffre toutes les 15 min, missions du jour, VIP + rakeback, succès, classement IA, flux de paris en direct
- **Équité prouvable** : HMAC-SHA256(seed serveur, seed client:nonce:round), comme les casinos crypto

## Technique
HTML/CSS/JS vanilla (modules ES), aucun build. Sons synthétisés en direct (WebAudio), icônes et illustrations vectorielles maison, police Inter (OFL). Fonctionne hors ligne via service worker. Les images des skins (CDN Steam) et des cartes (TCGdex) sont chargées depuis leurs hébergeurs publics, jamais stockées dans ce dépôt.

Projet de fan non commercial, sans lien avec Valve, Nintendo, The Pokémon Company ou Stake.
