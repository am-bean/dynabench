import sqlalchemy as db
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# now this is very ugly..
def connect_db():
    engine = db.create_engine('mysql+pymysql://dynabench:dynabench@localhost:3306/dynabench')
    connection = engine.connect()
    Base.metadata.bind = engine
    DBSession = sessionmaker(bind=engine)
    return DBSession()

dbs = connect_db()

class BaseModel():
    def __init__(self, model):
        self.model = model

    def get(self, id):
        try:
            return dbs.query(self.model).filter(self.model.id == id).one()
        except db.orm.exc.NoResultFound:
            return False

    def list(self):
        rows = dbs.query(self.model).all()
        return [r.to_dict() for r in rows]

    def update(self, id, kwargs):
        t = dbs.query(self.model).filter(self.model.id == id)
        t.update(kwargs)
        dbs.commit()
