from sqlalchemy import Column, Date, Float, Integer, String

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    type = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
