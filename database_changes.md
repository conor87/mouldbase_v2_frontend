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

## Kolejność wykonania

1. Najpierw utwórz tabelę `machine_groups` (punkt 1)
2. Potem dodaj kolumnę `machine_group_id` w `workstations` (punkt 3) — wymaga istnienia tabeli `machine_groups`
3. Punkty 2 i 4 można wykonać niezależnie
