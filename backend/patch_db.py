import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    for col, typ in [
        ('monthly_post_quota', 'INTEGER DEFAULT 12'),
        ('monthly_calls_quota', 'INTEGER DEFAULT 2'),
        ('health_score', 'INTEGER DEFAULT 95'),
        ('brand_vault', 'JSON DEFAULT "{}"')
    ]:
        try:
            conn.execute(text(f'ALTER TABLE leads ADD COLUMN {col} {typ}'))
            conn.commit()
            print(f'Added column {col}')
        except Exception as e:
            print(f'Column {col} status: {e}')
print("Done checking columns.")
