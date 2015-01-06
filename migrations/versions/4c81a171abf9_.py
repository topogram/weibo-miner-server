"""
Init  : create User, Topogram, Topotype, Dataset, Regexp

Revision ID: 4c81a171abf9
Revises: None
Create Date: 2015-01-06 17:48:21.084099

"""

# revision identifiers, used by Alembic.
revision = '4c81a171abf9'
down_revision = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### Create DB ###
    op.create_table('user',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password', sa.String(length=80), nullable=False),
    sa.Column('role', sa.String(length=120), nullable=True),
    sa.Column('active', sa.Boolean(), nullable=True),
    sa.Column('registered_on', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('topotype',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('languages', sa.String(length=120), nullable=False),
    sa.Column('text_column', sa.String(length=120), nullable=True),
    sa.Column('timestamp_column', sa.String(length=120), nullable=True),
    sa.Column('time_pattern', sa.String(length=120), nullable=True),
    sa.Column('stopwords', sa.Text(), nullable=True),
    sa.Column('ignore_citations', sa.String(length=120), nullable=True),
    sa.Column('source_column', sa.String(length=120), nullable=True),
    sa.Column('dest_column', sa.String(length=120), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('dataset',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('filepath', sa.String(length=120), nullable=True),
    sa.Column('index_name', sa.String(length=150), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('topotype_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['topotype_id'], ['topotype.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('regexp',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('regexp', sa.String(length=120), nullable=False),
    sa.Column('citation_patterns_id', sa.Integer(), nullable=True),
    sa.Column('stop_patterns_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['citation_patterns_id'], ['topotype.id'], ),
    sa.ForeignKeyConstraint(['stop_patterns_id'], ['topotype.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('title')
    )
    op.create_index(op.f('ix_regexp_citation_patterns_id'), 'regexp', ['citation_patterns_id'], unique=False)
    op.create_index(op.f('ix_regexp_stop_patterns_id'), 'regexp', ['stop_patterns_id'], unique=False)
    op.create_table('topogram',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('es_index_name', sa.String(length=200), nullable=False),
        sa.Column('es_query', sa.String(length=150), nullable=False),
        sa.Column('data_mongo_id', sa.String(length=150), nullable=True),
        sa.Column('records_count', sa.Integer(), nullable=True),
        sa.Column('words_limit', sa.Integer(), nullable=True),
        sa.Column('citations_limit', sa.Integer(), nullable=True),
        sa.Column('words', sa.Text(), nullable=True),
        sa.Column('citations', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('dataset_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['dataset_id'], ['dataset.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    ### end Alembic commands ###


def downgrade():
    op.drop_table('topogram')
    op.drop_table('dataset')
    op.drop_table('user')

    op.drop_table('regexp')
    op.drop_table('topotype')

    ### end Alembic commands ###
