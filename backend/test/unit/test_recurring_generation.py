from datetime import date
from decimal import Decimal

from app.models.models import RecurringTransaction
from app.services.recurring import add_months, generate_for_rule, occurrence


def test_add_months_clamps_to_month_end():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)


def test_add_months_rolls_over_year():
    assert add_months(date(2026, 12, 15), 1) == date(2027, 1, 15)


def test_occurrence_monthly_recomputed_from_start():
    # Recomputing from start avoids month-end drift (Jan 31 -> Mar 31, not Mar 28).
    assert occurrence(date(2026, 1, 31), "monthly", 2) == date(2026, 3, 31)


def test_occurrence_weekly():
    assert occurrence(date(2026, 1, 1), "weekly", 3) == date(2026, 1, 22)


def _rule(**overrides) -> RecurringTransaction:
    defaults = dict(
        type="income",
        category="salary",
        amount=Decimal("1000.00"),
        description=None,
        frequency="monthly",
        start_date=date(2026, 1, 15),
        end_date=None,
        is_active=True,
        last_generated_date=None,
    )
    defaults.update(overrides)
    return RecurringTransaction(**defaults)


def test_generate_for_rule_creates_due_occurrences():
    txns = generate_for_rule(_rule(), today=date(2026, 3, 20))
    assert [t.date for t in txns] == [date(2026, 1, 15), date(2026, 2, 15), date(2026, 3, 15)]


def test_generate_for_rule_updates_last_generated():
    rule = _rule()
    generate_for_rule(rule, today=date(2026, 3, 20))
    assert rule.last_generated_date == date(2026, 3, 15)


def test_generate_for_rule_is_idempotent():
    rule = _rule(last_generated_date=date(2026, 3, 15))
    assert generate_for_rule(rule, today=date(2026, 3, 20)) == []


def test_generate_for_rule_respects_end_date():
    rule = _rule(end_date=date(2026, 2, 20))
    txns = generate_for_rule(rule, today=date(2026, 6, 1))
    assert [t.date for t in txns] == [date(2026, 1, 15), date(2026, 2, 15)]


def test_generate_for_rule_skips_inactive():
    assert generate_for_rule(_rule(is_active=False), today=date(2026, 3, 20)) == []
