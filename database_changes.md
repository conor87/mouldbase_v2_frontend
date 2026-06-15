# Zmiany w bazie danych

Poniżej znajdują się wszystkie zmiany w bazie danych wymagane do działania nowych funkcjonalności.
Projekt nie korzysta z Alembic — migracje należy wykonać ręcznie (SQL).

---

## 1. Nowa tabela: `machine_groups`

Grupy maszyn wykorzystywane w MES i przypisywane do stanowisk produkcyjnych.

```sql
CREATE TABLE machine_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);
```

---

## 2. Tabela `machine_statuses` — nowa kolumna `color`

Kolor statusu maszyny wyświetlany w interfejsie (np. green, red, yellow).

```sql
ALTER TABLE machine_statuses ADD COLUMN color VARCHAR(30) NULL;
```

---

## 3. Tabela `workstations` — nowa kolumna `machine_group_id`

Powiązanie stanowiska produkcyjnego z grupą maszyn.

```sql
ALTER TABLE workstations ADD COLUMN machine_group_id INTEGER NULL
    REFERENCES machine_groups(id);
```

---

## 4. Tabela `operations` — nowa kolumna `sort_order`

Kolejność wyświetlania operacji na liście MES (drag & drop). Nowe operacje otrzymują domyślną wartość 999. Po zmianie kolejności przez użytkownika wartości są nadpisywane (1, 2, 3...).

```sql
ALTER TABLE operations ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 999;
```

---

## 5. Tabela `workstations` — nowa kolumna `current_operation_id`

Powiązanie stanowiska z aktualnie wykonywaną operacją. Umożliwia przejście z dashboardu produkcji bezpośrednio do panelu maszyny.

```sql
ALTER TABLE workstations ADD COLUMN current_operation_id INTEGER NULL
    REFERENCES operations(id) ON DELETE SET NULL;
```

---

## 6. Nowa tabela: `stanowiska_service`

Stanowiska serwisowe dla modułu Service Admin.

```sql
CREATE TABLE stanowiska_service (
    id SERIAL PRIMARY KEY,
    nazwa_stanowiska VARCHAR(100) NOT NULL UNIQUE,
    st VARCHAR(50) NULL,
    status VARCHAR(50) NULL,
    aktualne_przezbrojenie_id INTEGER NULL,
    aktualne_zlecenie_serwisowe_id INTEGER NULL,
    aktualny_typ_zlecenia VARCHAR(100) NULL,
    status_changeovers VARCHAR(50) NULL,
    user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 7. Nowa tabela: `service_log`

Zunifikowana tabela logów serwisowych — rejestruje każdą zmianę statusu zarówno z serwisowania form jak i z przezbrojeń.

```sql
CREATE TABLE service_log (
    id SERIAL PRIMARY KEY,
    operator VARCHAR(100) NULL,
    created_at VARCHAR(50) NULL,
    status_service VARCHAR(50) NULL,
    mes_activ_service_id INTEGER NULL,
    mes_activ_changeover_id INTEGER NULL,
    status_changeover VARCHAR(50) NULL
);
```

---

## 8. Tabela `service_log` — nowa kolumna `mould_number`

Numer formy powiązany z wpisem logu serwisowego, umożliwia śledzenie której formy dotyczyła operacja.

```sql
ALTER TABLE service_log ADD COLUMN IF NOT EXISTS mould_number VARCHAR(50) NULL;
```

---

## 9. Tabela `analytica_workers` — nowa kolumna `order_number` i zmiana constraintu

Dodano numer zlecenia do analityki czasu pracy pracowników. Wymaga usunięcia starego ograniczenia unikalności i utworzenia nowego uwzględniającego numer zlecenia. Alternatywnie (jako że są to dane cacheowane z logów) można po prostu zrobić `DROP TABLE analytica_workers;` i zrestartować backend - SQLAlchemy otworzy tabelę na nowo.

```sql
ALTER TABLE analytica_workers ADD COLUMN IF NOT EXISTS order_number VARCHAR(64) NULL;
ALTER TABLE analytica_workers DROP CONSTRAINT IF EXISTS uq_user_date_workstation;
ALTER TABLE analytica_workers ADD CONSTRAINT uq_user_date_ws_order UNIQUE (user_id, date, workstation_id, order_number);
```

---

## 10. Tabela `analytica_machines` — nowa kolumna `user_id` i zmiana constraintu

Dodano powiązanie logu maszyny z użytkownikiem (operator), aby na jednej maszynie można było rozdzielać czasy na konkretnych pracowników. Alternatywnie, bezpiecznie jest zrobić `DROP TABLE analytica_machines;` i zrestartować backend.

```sql
ALTER TABLE analytica_machines ADD COLUMN IF NOT EXISTS user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE analytica_machines DROP CONSTRAINT IF EXISTS uq_ws_date_operation;
ALTER TABLE analytica_machines ADD CONSTRAINT uq_ws_date_op_user UNIQUE (workstation_id, date, operation_id, user_id);
```

---

## 11. Tabela `system_settings` — nowa tabela ustawień globalnych

Dodano tabelę do przechowywania globalnych ustawień systemu, takich jak status włączenia automatycznego wylogowywania pracowników.

```sql
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

-- Domyślne włączenie funkcji autowylogowania
INSERT INTO system_settings (key, value) VALUES ('auto_logout_enabled', 'true') ON CONFLICT (key) DO NOTHING;
```

---

## Kolejność wykonania

1. Najpierw utwórz tabelę `machine_groups` (punkt 1)
2. Potem dodaj kolumnę `machine_group_id` w `workstations` (punkt 3) — wymaga istnienia tabeli `machine_groups`
3. Punkty 2, 4, 5, 6, 7, 8, 9, 10 i 11 można wykonać niezależnie. Po wdrożeniu skryptów (szczególnie nowych tabel) zrestartuj backend.
