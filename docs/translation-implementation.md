# Multilingual System Implementation - Zusammenfassung

## Übersicht

Dieses Dokument beschreibt die vollständige mehrsprachige Implementation von Budget Zen, einschließlich:
- System-Kategorien mit automatischer Übersetzung
- Benutzer-Kategorien mit Original-Namen
- Locale-spezifische Währungsformatierung
- Übersetzte UI-Komponenten und Keyboard Shortcuts

Die Implementation ermöglicht mehrsprachige System-Kategorien, die automatisch in der gewählten App-Sprache angezeigt werden, während vom Benutzer erstellte Kategorien ihren ursprünglichen Namen beibehalten.

## Datenbank-Migration

**WICHTIG:** Führe diese SQL-Migration in deiner Supabase-Datenbank aus:

```bash
# Datei mit SQL-Befehlen:
./migration-add-translation-key.sql
```

Die Migration fügt hinzu:
- `translation_key` Spalte zur `categories` Tabelle
- Index für bessere Performance
- Check Constraint (entweder `name` ODER `translation_key` muss gesetzt sein)
- Migriert bestehende Standard-Kategorien zu System-Kategorien

## Implementierte Änderungen

### 1. Neue Dateien

#### `migration-add-translation-key.sql`
SQL-Migration für Datenbank-Schema-Updates und Migration bestehender Daten.

#### `lib/i18n-helpers.ts`
Helper-Funktionen und Best-Practice-Dokumentation für mehrsprachige Inhalte:
- `getCategoryDisplayName()` - Zeigt System-Kategorien übersetzt oder User-Namen direkt an
- `getAccountDisplayName()` - Zeigt Account-Namen direkt an (keine Übersetzung)
- Ausführliche Dokumentation des empfohlenen Ansatzes

### 2. Aktualisierte Dateien

#### Übersetzungsdateien
- `messages/en.json` - Englische Übersetzungen für alle System-Kategorien hinzugefügt
- `messages/de.json` - Deutsche Übersetzungen für alle System-Kategorien hinzugefügt

Verfügbare Kategorien:
- **Einnahmen:** salary, freelance, investment, gift, other
- **Ausgaben:** groceries, rent, transport, eatingOut, entertainment, health, shopping, utilities, insurance, education, travel

#### Typen & Schema
- `lib/types.ts` - Category Interface um `translation_key` erweitert
- `app/actions/seed.ts` - Seed-Daten verwenden jetzt `translation_key` statt `name`

#### Komponenten
Alle Komponenten verwenden jetzt `getCategoryDisplayName()`:
- `app/[locale]/page.tsx` - Dashboard/Transaktionsliste
- `components/transactions/quick-add-dialog.tsx` - Kategorie-Dropdown
- `components/settings/categories-tab.tsx` - Kategorien-Übersicht
- `components/settings/category-dialog.tsx` - Kategorie-Dialog (Create/Edit)
- `components/settings/delete-category-dialog.tsx` - Lösch-Dialog

## Wie es funktioniert

### System-Kategorien (automatisch übersetzt)
```typescript
{
  id: "uuid",
  translation_key: "category.groceries",  // ← Key für Übersetzung
  name: null,
  icon: "ShoppingCart",
  color: "#f59e0b",
  type: "expense"
}
```

Wird angezeigt als:
- Englisch: "Groceries"
- Deutsch: "Lebensmittel"

### User-Kategorien (werden nicht übersetzt)
```typescript
{
  id: "uuid",
  name: "Autowäsche",  // ← Direkter Name
  translation_key: null,
  icon: "Car",
  color: "#3b82f6",
  type: "expense"
}
```

Wird immer als "Autowäsche" angezeigt, unabhängig von der Sprache.

## Währungsformatierung

### Implementation

Die Währungsformatierung verwendet die `Intl.NumberFormat` API für locale-spezifische Formatierung:

```typescript
// lib/currency.ts
export function formatCurrency(
  amount: number,
  currencyCode: string,
  prefix = '',
  locale = 'de-DE'
): string {
  const formattedAmount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  if (config.position === 'after') {
    return `${prefix}${formattedAmount} ${config.symbol}`
  } else {
    return `${prefix}${config.symbol}${formattedAmount}`
  }
}
```

### Locale-Mapping

```typescript
export function getFullLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    'de': 'de-DE',
    'en': 'en-US',
    'fr': 'fr-FR',
    'es': 'es-ES',
    // ... mehr Locales
  }
  return localeMap[locale] || 'de-DE'
}
```

### Beispiele

**Deutsch (de-DE):**
- 4.273,00 € (Punkt für Tausender, Komma für Dezimalstellen)
- -1.234,56 €
- +987,65 €

**Englisch (en-US):**
- 4,273.00 € (Komma für Tausender, Punkt für Dezimalstellen)
- -1,234.56 €
- +987.65 €

### Unterstützte Währungen

20+ Währungen mit korrekter Symbol-Positionierung:
- **Nach Betrag:** EUR, CHF, SEK, NOK, DKK, PLN, CZK, usw.
- **Vor Betrag:** USD, GBP, JPY, CNY, INR, AUD, CAD, usw.

## Keyboard Shortcuts Übersetzung

### Problem

Ursprünglich waren Keyboard Shortcut-Beschreibungen hardcoded in Englisch:

```tsx
// ❌ Vorher - Hardcoded English
<span>Press <kbd>Enter</kbd> to save and close.</span>
```

### Lösung

Übersetzungs-Keys hinzugefügt und verwendet:

```tsx
// ✅ Nachher - Multilingual
<span>
  {t('transaction.press')}{' '}
  <kbd className="...">Enter</kbd>{' '}
  {t('transaction.toSaveAndClose')}
</span>
```

### Übersetzungen

**messages/en.json:**
```json
{
  "transaction": {
    "press": "Press",
    "toSaveAndClose": "to save and close.",
    "or": "or",
    "toSaveAndAddAnother": "to save and add another."
  }
}
```

**messages/de.json:**
```json
{
  "transaction": {
    "press": "Drücke",
    "toSaveAndClose": "zum Speichern und Schließen.",
    "or": "oder",
    "toSaveAndAddAnother": "zum Speichern und weitere hinzufügen."
  }
}
```

### Formatting

Alle Keyboard Shortcuts verwenden jetzt konsistentes Styling:

```tsx
<kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
  Enter
</kbd>
```

**Features:**
- Monospace Font (`font-mono`)
- Graue Hintergrundfarbe (`bg-zinc-100`)
- Sichtbarer Rand (`border border-zinc-300`)
- Konsistente Padding und Margins

## Deployment-Schritte

1. **Migration ausführen:**
   ```bash
   # In Supabase SQL Editor oder via CLI
   psql $DATABASE_URL < migration-add-translation-key.sql
   ```

2. **App neu deployen:**
   ```bash
   npm run build
   npm run start
   # oder dein Deployment-Prozess
   ```

3. **Testen:**
   - Sprache zwischen EN/DE wechseln
   - System-Kategorien sollten übersetzt werden
   - User-Kategorien behalten ihren Namen
   - Neue Kategorien erstellen funktioniert

## Betroffene Komponenten

Alle folgenden Komponenten wurden aktualisiert, um `getCategoryDisplayName()` zu verwenden:

### 1. Dashboard
**Datei:** `app/[locale]/page.tsx`
- Zeigt Kategorien in Transaktionsliste mit übersetzten Namen
- Verwendet `formatCurrency()` mit Locale-Parameter
- Zeigt Keyboard Shortcut für Quick Add (Press N)

### 2. Quick Add Dialog
**Datei:** `components/transactions/quick-add-dialog.tsx`
- Kategorie-Dropdown zeigt übersetzte System-Kategorien
- Multilingual Dialog-Beschreibung mit formatierten Shortcuts
- Verwendet Übersetzungs-Keys für alle UI-Texte

### 3. Settings - Categories Tab
**Datei:** `components/settings/categories-tab.tsx`
- Listet alle Kategorien mit übersetzten Namen
- Zeigt Kategorie-Typ (Einnahme/Ausgabe) übersetzt
- Icon und Farbe werden korrekt angezeigt

### 4. Category Dialog (Create/Edit)
**Datei:** `components/settings/category-dialog.tsx`
- Lädt übersetzte Namen in Form-Defaults
- `useEffect` Hook aktualisiert Form bei Kategorie-Wechsel
- Speichert User-Kategorien mit direktem Namen

### 5. Delete Category Dialog
**Datei:** `components/settings/delete-category-dialog.tsx`
- Zeigt übersetzten Kategorienamen in Bestätigungsdialog
- Warnung mit dynamischem Namen

### 6. Summary Cards
**Datei:** `components/dashboard/summary-cards.tsx`
- Verwendet `formatCurrency()` mit Locale für alle Beträge
- Balance, Income, Expenses, Net Flow alle locale-aware
- Zeigt Tausendertrennzeichen und Dezimalstellen korrekt

## Vorteile

✅ **Professionell:** System-Kategorien sind korrekt übersetzt
✅ **Einfach:** Benutzer erstellen Kategorien in ihrer Sprache
✅ **Transparent:** Was du eingibst, siehst du auch
✅ **Performant:** Keine API-Calls oder komplexe Übersetzungslogik
✅ **Flexibel:** Neue System-Kategorien können einfach hinzugefügt werden
✅ **Locale-Aware:** Währungen werden korrekt nach Sprache formatiert
✅ **Konsistent:** Alle UI-Texte und Shortcuts sind übersetzt
✅ **Wartbar:** Zentrale Helper-Funktionen für einfache Updates

## Bestehende Daten

Die Migration aktualisiert automatisch diese Standard-Kategorien:
- Salary, Freelance (Einnahmen)
- Groceries, Rent, Transport, Eating Out, Entertainment, Health, Shopping (Ausgaben)

Alle anderen (vom User erstellten) Kategorien bleiben unverändert und verwenden weiterhin ihr `name` Feld.

## Hinzufügen neuer System-Kategorien

1. Übersetzung in `messages/en.json` und `messages/de.json` hinzufügen:
   ```json
   "category": {
     "newCategory": "New Category"
   }
   ```

2. In `app/actions/seed.ts` zur Seed-Liste hinzufügen:
   ```typescript
   {
     user_id: userId,
     translation_key: 'category.newCategory',
     icon: 'IconName',
     color: '#hexcolor',
     type: 'income' // oder 'expense'
   }
   ```

Das war's! Die Komponenten holen sich die Übersetzung automatisch via `getCategoryDisplayName()`.

---

## Zusammenfassung der Implementation

### Phase 1: Datenbank-Schema ✅
- `translation_key` Spalte hinzugefügt
- NOT NULL Constraint von `name` entfernt
- Check Constraint: `name` OR `translation_key` erforderlich
- Index auf `translation_key` für Performance
- Migration bestehender Daten

### Phase 2: Helper-Funktionen ✅
- `lib/i18n-helpers.ts` erstellt
- `getCategoryDisplayName()` für Kategorien
- `getAccountDisplayName()` Dokumentation
- Best Practices dokumentiert

### Phase 3: Übersetzungen ✅
- 16 Kategorien in `messages/en.json`
- 16 Kategorien in `messages/de.json`
- Keyboard Shortcut-Texte hinzugefügt
- Alle UI-Texte übersetzt

### Phase 4: Währungsformatierung ✅
- `lib/currency.ts` erweitert
- `Intl.NumberFormat` Integration
- `getFullLocale()` Mapping-Funktion
- 20+ Währungen mit Symbol-Positionierung
- Locale-spezifische Tausender/Dezimaltrennzeichen

### Phase 5: UI-Komponenten ✅
- Dashboard aktualisiert
- Quick Add Dialog aktualisiert
- Settings/Categories Tab aktualisiert
- Category Dialog aktualisiert
- Delete Dialog aktualisiert
- Summary Cards aktualisiert
- Alle Shortcuts formatiert und übersetzt

### Phase 6: Testing & Verification ✅
- Sprachenwechsel EN/DE funktioniert
- System-Kategorien werden übersetzt
- User-Kategorien behalten Namen
- Währungen werden locale-spezifisch formatiert
- Keyboard Shortcuts sind multilingual
- Keine hardcoded English-Texte mehr

## Statistik

**Dateien erstellt:** 2
- `migration-add-translation-key.sql`
- `lib/i18n-helpers.ts`

**Dateien aktualisiert:** 11
- `messages/en.json`
- `messages/de.json`
- `lib/types.ts`
- `lib/currency.ts`
- `app/[locale]/page.tsx`
- `components/transactions/quick-add-dialog.tsx`
- `components/settings/categories-tab.tsx`
- `components/settings/category-dialog.tsx`
- `components/settings/delete-category-dialog.tsx`
- `components/dashboard/summary-cards.tsx`
- `app/actions/seed.ts`

**Übersetzungs-Keys hinzugefügt:** 20+
- 16 Kategorien (category.*)
- 4 Keyboard Shortcut-Texte (transaction.press, etc.)

**Sprachen unterstützt:** 2
- Englisch (en)
- Deutsch (de)

**Locale-Formate unterstützt:** 10+
- de-DE, en-US, fr-FR, es-ES, it-IT, pt-PT, nl-NL, pl-PL, cs-CZ, sv-SE, usw.

---

**Status:** ✅ Vollständig implementiert und getestet
**Version:** 1.1.0
**Letztes Update:** 2026-01-13
