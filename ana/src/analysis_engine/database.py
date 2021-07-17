from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, create_engine, BigInteger
from sqlalchemy.engine.url import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.schema import Table
from datetime import datetime

from analysis_engine.utils import object_to_base_64, base_64_to_object, Timer


class DBSession(object):
    def __init__(self, db: 'Database', commit=False):
        self.db = db
        self.commit = commit

    def __enter__(self):
        self.db.session = self.db.get_session()

    def __exit__(self, type, error, traceback):
        if error is not None:
            self.db.session.rollback()
        elif self.commit:
            self.db.session.commit()

        self.db.session.close()
        self.db.session = None


def try_with_session(commit: bool = False):
    def wrap(func):
        def call(db, *args, **kwargs):
            # if the Database has an active session, don't create a new one
            if db.session is not None:
                result = func(db, *args, **kwargs)
                if commit:
                    db.session.commit()
            else:
                # otherwise, use the session generator
                with DBSession(db, commit=commit):
                    result = func(db, *args, **kwargs)

            return result

        return call

    return wrap


Base = declarative_base()

hub_parcel_table = Table('hub_parcel', Base.metadata,
    Column('hub_id', Integer, ForeignKey('hubs.id')),
    Column('parcel_id', Integer, ForeignKey('parcels.id'))
)

bus_parcel_table = Table('bus_parcel', Base.metadata,
    Column('bus_id', Integer, ForeignKey('busses.id')),
    Column('parcel_id', Integer, ForeignKey('parcels.id'))
)

bus_task_table = Table('bus_task', Base.metadata,
    Column('bus_id', Integer, ForeignKey('busses.id')),
    Column('task_id', Integer, ForeignKey('tasks.id'))
)

bus_active_task_table = Table('bus_active_task', Base.metadata,
    Column('bus_id', Integer, ForeignKey('busses.id')),
    Column('task_id', Integer, ForeignKey('tasks.id'))
)


class Experiment(Base):
    __tablename__ = 'experiments'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    session = Column(String, nullable=False)
    topology_64 = Column(Text)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    duration = Column(Integer)

    @property
    def topology(self) -> dict:
        return base_64_to_object(self.topology_64)

    @topology.setter
    def topology(self, value: dict):
        if value is None:
            d = {}
        else:
            d = value

        self.topology_64 = object_to_base_64(d)

    def __init__(self, id=None, session=None, topology=None, start_time=None, end_time=None, duration=None):
        self.id: Optional[int] = id
        self.session = session
        if topology is not None:
            self.topology = topology
        else:
            self.topology_64 = topology_64
        if start_time is not None:
            self.start_time = start_time
        else:
            self.start_time = datetime.now()
        self.end_time = end_time
        self.duration = duration

    def __repr__(self):
        return f'<{self.session}: {self.start_time}>'


class Parcel(Base):
    __tablename__ = 'parcels'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    destination = Column(Text)
    time_placed = Column(DateTime)
    time_delivered = Column(DateTime)

    def __init__(self, id=None, experiment_id=None, destination=None, time_placed=None, time_delivered=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.destination = destination
        self.time_placed = time_placed
        self.time_delivered = time_delivered

    def __repr__(self):
        return f'<{self.destination}: ({self.time_placed})>'


class Order(Base):
    __tablename__ = 'orders'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=False)
    state = Column(String, nullable=False)
    time = Column(DateTime, nullable=False)

    def __init__(self, id=None, experiment_id=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.parcel_id = parcel_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.state}>'


class Transaction(Base):
    __tablename__ = 'transactions'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    from_hub_id = Column(HybridType, ForeignKey('hubs.id'), nullable=True)
    from_car_id = Column(HybridType, ForeignKey('cars.id'), nullable=True)
    from_drone_id = Column(HybridType, ForeignKey('drones.id'), nullable=True)
    from_bus_id = Column(HybridType, ForeignKey('busses.id'), nullable=True)
    to_hub_id = Column(HybridType, ForeignKey('hubs.id'), nullable=True)
    to_car_id = Column(HybridType, ForeignKey('cars.id'), nullable=True)
    to_drone_id = Column(HybridType, ForeignKey('drones.id'), nullable=True)
    to_bus_id = Column(HybridType, ForeignKey('busses.id'), nullable=True)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=False)
    time_created = Column(DateTime, nullable=False)
    time_completed = Column(DateTime, nullable=False)

    def __init__(self, id=None, experiment_id=None, from_hub_id=None, from_car_id=None, from_drone_id=None,
                 from_bus_id=None, to_hub_id=None, to_car_id=None, to_drone_id=None, to_bus_id=None,
                 parcel_id=None, time_created=None, time_completed=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.from_hub_id = from_hub_id
        self.from_car_id = from_car_id
        self.from_drone_id = from_drone_id
        self.from_bus_id = from_bus_id
        self.to_hub_id = to_hub_id
        self.to_car_id = to_car_id
        self.to_drone_id = to_drone_id
        self.to_bus_id = to_bus_id
        self.parcel_id = parcel_id
        self.time_created = time_created
        self.time_completed = time_completed

    def __repr__(self):
        return f'<{self.id}>'


class Mission(Base):
    __tablename__ = 'missions'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    state = Column(String, nullable=False)
    time = Column(DateTime, nullable=False)

    def __init__(self, id=None, experiment_id=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.state}>'


class Task(Base):
    __tablename__ = 'tasks'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    mission_id = Column(HybridType, ForeignKey('missions.id'), nullable=False)
    type = Column(String, nullable=False)
    state = Column(String, nullable=False)
    destination_x = Column(Integer, nullable=False)
    destination_y = Column(Integer, nullable=False)
    transaction_id = Column(HybridType, ForeignKey('transactions.id'), nullable=False)
    time = Column(DateTime, nullable=False)

    def __init__(self, id=None, experiment_id=None, mission_id=None, type=None, state=None, destination_x=None,
                 destination_y=None, transaction_id=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.mission_id = mission_id
        self.type = type
        self.state = state
        self.destination_x = destination_x
        self.destination_y = destination_y
        self.transaction_id = transaction_id
        self.time = time

    def __repr__(self):
        return f'<{self.type}, {self.state}, ({self.destination_x},{self.destination_y})>'


class Hub(Base):
    __tablename__ = 'hubs'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    name = Column(String, nullable=False)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    parcels = relationship('Parcel', secondary=hub_parcel_table)
    time = Column(DateTime)

    def __init__(self, id=None, experiment_id=None, name=None, position_x=None, position_y=None,
                 time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.position_x = position_x
        self.position_y = position_y
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y})>'


class Car(Base):
    __tablename__ = 'cars'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    name = Column(String, nullable=False)
    task_id = Column(Text)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    speed = Column(Integer, nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=False)
    state = Column(String, nullable=False)
    time = Column(DateTime)

    def __init__(self, id=None, experiment_id=None, name=None, position_x=None, position_y=None,
                 speed=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.position_x = position_x
        self.position_y = position_y
        self.speed = speed
        self.parcel_id = parcel_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y}), {self.state}>'


class Drone(Base):
    __tablename__ = 'drones'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    name = Column(String, nullable=False)
    task_id = Column(Text)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    speed = Column(Integer, nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=False)
    state = Column(String, nullable=False)
    time = Column(DateTime)

    def __init__(self, id=None, experiment_id=None, name=None, position_x=None, position_y=None,
                 speed=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.position_x = position_x
        self.position_y = position_y
        self.speed = speed
        self.parcel_id = parcel_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y}), {self.state}>'


class Bus(Base):
    __tablename__ = 'busses'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.id'), nullable=False)
    name = Column(String, nullable=False)
    task_id = Column(Text)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    speed = Column(Integer, nullable=False)
    state = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    route = Column(Text)
    next_stop = Column(String, nullable=False)
    parcels = relationship('Parcel', secondary=bus_parcel_table)
    tasks = relationship('Task', secondary=bus_task_table)
    active_tasks = relationship('Task', secondary=bus_active_task_table)
    time = Column(DateTime)

    def __init__(self, id=None, experiment_id=None, name=None, position_x=None, position_y=None,
                 speed=None, parcel_id=None, state=None, capacity=None, route=None, next_stop=None, time=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.position_x = position_x
        self.position_y = position_y
        self.speed = speed
        self.parcel_id = parcel_id
        self.state = state
        self.capacity = capacity
        self.route = route
        self.next_stop = next_stop
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y}), {self.state}, {self.next_stop} is next stop>'


class Database(object):

    def __init__(self, dialect: str, username: str = None, password: str = None,
                 host: str = None, port: int = None, query: str = None):
        assert dialect in ['sqlite', 'postgresql'], 'Unknown database specified'

        if dialect == 'sqlite':
            db_url = f'sqlite:///{host}'
        else:
            db_url = URL(drivername=dialect, username=username,
                         password=password, host=host, port=port, query=query)

        self.engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=3600)
        self.session: Optional[Session] = None
        self.get_session = sessionmaker(bind=self.engine, expire_on_commit=False)

        Base.metadata.create_all(bind=self.engine)

        self.timer = Timer()

    @try_with_session(commit=True)
    def create_experiment(self, **kwargs) -> Experiment:
        experiment = Experiment(**kwargs)
        self.timer.start()
        self.session.add(experiment)
        return experiment

    def pause_resume_experiment(self):
        if self.timer.paused:
            self.timer.resume()
        else:
            self.timer.pause()

    @try_with_session(commit=True)
    def complete_experiment(self, experiment_id):
        experiment = self.session.query(Experiment).get(experiment_id)

        experiment.end_time = datetime.now()
        experiment.duration = self.timer.get()

    @try_with_session(commit=True)
    def create_mission(self, **kwargs):
        mission = Mission(**kwargs)
        self.session.add(mission)
        return mission

    @try_with_session(commit=True)
    def create_task_timestamp(self, **kwargs):
        mission = Mission(**kwargs)
        self.session.add(mission)
        return mission
