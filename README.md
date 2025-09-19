__*DISCLAIMER*__

This repository intentionally adds extra architectural surface area as a practice environment. Two distinct ideas are present:

1. Hexagonal (Ports and Adapters) architecture
    - Clear separation between domain (core model), application (orchestration / use cases), and infrastructure (databases, migrations, adapters).
    - Multiple persistence backends (Mongo, Postgres, Redis) are plugged in via adapters and a client registry.
    - Goal: exercise isolation, swapability, and test seams.

2. Domain-Driven Design (DDD) elements
    - Included: entities, value objects, repository interfaces, some domain error semantics.
    - Not (yet) included: strategic design (bounded contexts, context maps), explicit ubiquitous language documentation, rich domain services, aggregates with complex invariants.
    - Purpose here is to practice modeling and layering, not to claim full DDD maturity.

#### Why this matters
A production URL shortener of this size would normally pick one datastore and use far less abstraction. Treat this codebase as an architectural sandbox. If you fork it for a lean deployment, you can simplify:

- Pick a single primary database (e.g. Postgres).
- Drop the client registry; export one connection/pool.
- Replace generalized migration planner/plan with a single migration runner or existing tool.
- Collapse repository interfaces into concrete modules or route handlers if desired.
- Keep only the value objects / invariants that deliver clear business benefit.

## TODO

### Backend

- Add Auth
- Updates:
  - Remove isPersisted from domain (should not have that semantic)
  - replace base entity with identifiable interface.
  - Remove short service in favor of use cases.
- Add transaction context (middleware based on verb)
- Ability for users to create urls
- Separate persistence into anon (redis, fs) vs auth (mongo, postgres). Rework client types, update docker compose to only require what is needed, update configs to only require what is needed
- Rate limits anonymous vs account
- Add integration tests
- Write proper README
- Fold in migration initial setup

#### Stretch
- Abstract SQL into pgClient
- Add migration helpers e.g. create-db, migrate, etc (prod should auto migrate while dev should be triggered)
- Add file system repo as a counterpart to Redis
- Add different code generation strategies

### Frontend

- User Dashboard
