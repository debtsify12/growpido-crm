"""add disqualified to leadstage

Revision ID: e81a727d415b
Revises: f87bbebe4fb6
Create Date: 2026-08-18 01:06:50.161228

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e81a727d415b'
down_revision: Union[str, None] = 'f87bbebe4fb6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute("ALTER TYPE leadstage ADD VALUE IF NOT EXISTS 'disqualified'")
    elif bind.engine.name != 'sqlite':
        with op.batch_alter_table('leads', schema=None) as batch_op:
            batch_op.alter_column('stage',
                   existing_type=sa.VARCHAR(length=30),
                   type_=sa.Enum('new_lead', 'discovery_call_booked', 'discovery_done', 'proposal_sent', 'negotiation', 'won', 'onboarding', 'active_client', 'upsell', 'disqualified', 'referral', 'lost', name='leadstage'),
                   existing_nullable=False)


def downgrade() -> None:
    pass
