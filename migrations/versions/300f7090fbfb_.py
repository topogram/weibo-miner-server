"""empty message

Revision ID: 300f7090fbfb
Revises: 501067fed1e3
Create Date: 2014-12-05 12:39:09.083756

"""

# revision identifiers, used by Alembic.
revision = '300f7090fbfb'
down_revision = '501067fed1e3'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('topotype', sa.Column('time_column', sa.String(length=120), nullable=True))
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('topotype', 'time_column')
    ### end Alembic commands ###