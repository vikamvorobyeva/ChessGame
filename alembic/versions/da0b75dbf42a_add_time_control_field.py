"""Add time_control field

Revision ID: da0b75dbf42a
Revises: 685cab6ab3c8
Create Date: 2025-05-06 13:52:34.678243

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da0b75dbf42a'
down_revision: Union[str, None] = '685cab6ab3c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('rooms', sa.Column('time_control', sa.String(), nullable=True))
    op.alter_column('users', 'about',
               existing_type=sa.TEXT(),
               type_=sa.String(),
               existing_nullable=True,
               existing_server_default=sa.text("''::text"))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('users', 'about',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=True,
               existing_server_default=sa.text("''::text"))
    op.drop_column('rooms', 'time_control')
    # ### end Alembic commands ###
