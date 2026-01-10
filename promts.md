W katalogu git/lamela_mes znajduje się projekt do przeniesienia do aplikacji właśnie tworzonej.
Aplikacja służy do zarządzania zleceniami w dziale produkcji form wtryskowych.

Celem jest stworzenie modułów potrzebnych do zarządzania zleceniami.
potrzebne tabele:
statusy maszyn - id, numer statusu, status (np. Praca z operatorem);
typy zleceń - id, skrót, Pełna nazwa (np. nowa forma; modyfikacja);
zamowienia - id, numer zlecenia, typ zlecenia, czy zakończone, zespół, nazwa wyrobu (np. 1, HM/25/001/BR, nowa forma, nie, D1-680, Magnolia jumper 100);
zlecenia - id, zamowienie, numer_detalu, nazwa_detalu, czy_zakończone, ilość sztuk (np. 1, D1-680-Magnolia jumper 100, 1, matryca, nie, 1);
stanowiska produkcyjne - id, nazwa stanowiska, stanowisko kosztów, status, aktualne zlecenie, user (np. frezarka HZF, ST3, Praca z operatorem, HM/25/001/BR/001/12, karol );
operacje - id, zlecenie, nr_operacji, opis_operacji, created_at, sugerowany_czas_realizacji, czy_zakończone, czy_przekazane_do_realizacji, czy_rozpoczęte, czas_wykonania_operacji, czas_wykonania_operacji_na_zmianie, stanowisko, (np. 1, D1-680-Magnolia jumper 100/matryca, 1, frezowanie zgrubne, 2025-01-01 10:00, 100, nie, tak, tak, 5h30min, 1h30min, frezarka HZF);
logi;


