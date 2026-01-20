# Budget Zen - Budgetierungskonzept v1.4.0

## 1. Konzept-Übersicht

**Zusammenfassung**
Budget Zen implementiert ein Zero-Based Budgeting (ZBB) System mit einem strikten "Zwei-Säulen-Ansatz" für Rücklagen ("Sinking Funds"). Der Kernmechanismus unterscheidet nicht zwischen reinen Ausgaben und Sparbeträgen, sondern behandelt jeden Geldfluss als Zuordnung in einen "Topf" (Category), der eine spezifische Rollover-Strategie verfolgt. [cite_start]Ziel ist die Glättung des Cashflows durch die monatliche Besparung zukünftiger Verbindlichkeiten und Wünsche sowie die Automatisierung des Monatsübergangs[cite: 3, 4, 18, 93].

**Primäre User-Bedürfnisse**

- [cite_start]**Liquiditätssicherheit:** Vermeidung von Engpässen bei jährlichen Zahlungen durch deterministische Ansparung (Sinking Funds 1)[cite: 21, 93].
- [cite_start]**Schuld-Vermeidung:** Ein Warnsystem zwingt den User, Überziehungen sofort durch Umbuchungen auszugleichen ("Whack-a-Mole" Prinzip)[cite: 55].
- [cite_start]**Automatisierung:** Der Monatswechsel berechnet automatisch Startsalden basierend auf definierten Regeln (kein manuelles Übertragen nötig)[cite: 33, 94].

**Inspirationsquellen**

- [cite_start]"Valles Vaterfreuden"-Methode: Zwei-Säulen-Modell der Sinking Funds und "Sweep"-Gamification[cite: 3, 66].
- [cite_start]YNAB (You Need A Budget): "Rule 3: Roll with the punches" (Flexibilität bei Überziehungen)[cite: 55, 96].

---

## 2. Kern-Entitäten

### 2.1 Category (Der "Topf")

**Name & Zweck:** Die zentrale Einheit. Jede Ausgabe, jedes Sparziel und jede Fixkoste ist technisch eine `Category`. [cite_start]Es gibt keine separate "Sparziel"-Entität[cite: 9].

**Eigenschaften:**

- [cite_start]`ID`: UUID [cite: 11]
- [cite_start]`Name`: String (z.B. "KFZ-Versicherung", "Lebensmittel") [cite: 12]
- [cite_start]`Type`: Enum (`FIX`, `VARIABLE`, `SF1`, `SF2`, `INCOME`) [cite: 13]
- [cite_start]`RolloverStrategy`: Enum (`ACCUMULATE`, `RESET`, `SWEEP`) – Definiert das Verhalten am Monatsende[cite: 14].
- [cite_start]`TargetAmount`: Decimal (Pflicht für SF1, Optional für SF2)[cite: 15, 19].
- [cite_start]`DueDate`: Date (Pflicht für SF1)[cite: 16, 19].

**Verhalten:** Definiert die Regeln für den Monatsübertrag (siehe Abschnitt 4).
**User-Interaktion:** User erstellt Kategorien im Setup; Sinking Funds erfordern Zielbetrag und Datum.

### 2.2 BudgetMonth (Der "Zeitraum")

**Name & Zweck:** Die Instanz einer Kategorie in einem spezifischen Monat (z.B. "Miete im März 2024"). [cite_start]Hier werden Budgets zugewiesen und verfolgt[cite: 37].

**Eigenschaften:**

- [cite_start]`Assigned`: Manuell oder automatisch zugewiesenes Geld (Zufluss).
- [cite_start]`Activity`: Summe der Transaktionen in diesem Monat (Abfluss, meist negativ).
- [cite_start]`StartBalance`: Übertrag aus dem Vormonat (Resultat der Rollover-Logik)[cite: 39].
- [cite_start]`Available`: Dynamisch berechnet: `StartBalance + Assigned + Activity`.

**Verhalten:** Wird bei jedem Monatswechsel neu instanziiert.
**User-Interaktion:** Das Haupt-Interface für das monatliche Budgetieren ("Stuffing").

---

## 3. Beziehungen & Datenfluss

[cite_start]Der Datenfluss folgt einem zyklischen Modell ("Cycle of Budgeting")[cite: 33].

```text
EINKOMMEN (Transaktion)
      ↓
[Unallocated Income Pool] (Virtueller Auffangbehälter)
      [cite_start]↓ (Allocation / "Stuffing" Phase) [cite: 44]
CATEGORY BUDGET (BudgetMonth)
      │
      ├←── StartBalance (Rollover vom Vormonat) [cite: 39]
      │
      ↓ (Spending Phase)
TRANSAKTIONEN (Activity) [cite: 50]
      ↓
END BALANCE (Berechnung für nächsten Monat)
```
