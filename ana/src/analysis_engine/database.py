from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, create_engine, BigInteger
from sqlalchemy.engine.url import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.schema import Table
from datetime import datetime
import pandas as pd

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


class HubParcelTable(Base):
    __tablename__ = 'hub_parcel'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True)
    parcel_id = Column(Integer, ForeignKey('parcels.id'), primary_key=True)
    hub_id = Column(Integer, ForeignKey('hubs.name'), primary_key=True)
    time_received = Column(DateTime)
    time_removed = Column(DateTime)

    def __init__(self, id=None, parcel_id=None, hub_id=None, time_received=None, time_removed=None):
        self.id = id
        self.parcel_id = parcel_id
        self.hub_id = hub_id
        self.time_received = time_received
        self.time_removed = time_removed


bus_parcel_table = Table('bus_parcel', Base.metadata,
                         Column('bus_id', Integer, ForeignKey('bus_timestamps.id'), primary_key=True),
                         Column('parcel_id', Integer, ForeignKey('parcels.id'))
                         )

bus_task_table = Table('bus_task', Base.metadata,
                       Column('bus_id', Integer, ForeignKey('bus_timestamps.id'), primary_key=True),
                       Column('task_id', Integer, ForeignKey('tasks.id'))
                       )

bus_active_task_table = Table('bus_active_task', Base.metadata,
                              Column('bus_id', Integer, ForeignKey('bus_timestamps.id'), primary_key=True),
                              Column('task_id', Integer, ForeignKey('tasks.id'))
                              )


class TransactionHubHubAssociation(Base):
    __tablename__ = 'transaction_hub_hub'

    from_id = Column(Integer, ForeignKey('hubs.name'))
    to_id = Column(Integer, ForeignKey('hubs.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionHubCarAssociation(Base):
    __tablename__ = 'transaction_hub_car'

    from_id = Column(Integer, ForeignKey('hubs.name'))
    to_id = Column(Integer, ForeignKey('cars.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionHubDroneAssociation(Base):
    __tablename__ = 'transaction_hub_drone'

    from_id = Column(Integer, ForeignKey('hubs.name'))
    to_id = Column(Integer, ForeignKey('drones.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionHubBusAssociation(Base):
    __tablename__ = 'transaction_hub_bus'

    from_id = Column(Integer, ForeignKey('busses.name'))
    to_id = Column(Integer, ForeignKey('drones.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionCarCarAssociation(Base):
    __tablename__ = 'transaction_car_car'

    from_id = Column(Integer, ForeignKey('cars.name'))
    to_id = Column(Integer, ForeignKey('cars.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionCarDronesAssociation(Base):
    __tablename__ = 'transaction_hub_drones'

    from_id = Column(Integer, ForeignKey('cars.name'))
    to_id = Column(Integer, ForeignKey('drones.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionCarBusAssociation(Base):
    __tablename__ = 'transaction_car_bus'

    from_id = Column(Integer, ForeignKey('cars.name'))
    to_id = Column(Integer, ForeignKey('busses.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionDroneDroneAssociation(Base):
    __tablename__ = 'transaction_drone_drone'

    from_id = Column(Integer, ForeignKey('drones.name'))
    to_id = Column(Integer, ForeignKey('drones.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionDroneBusAssociation(Base):
    __tablename__ = 'transaction_drone_bus'

    from_id = Column(Integer, ForeignKey('drones.name'))
    to_id = Column(Integer, ForeignKey('busses.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class TransactionBusBusAssociation(Base):
    __tablename__ = 'transaction_bus_bus'

    from_id = Column(Integer, ForeignKey('busses.name'))
    to_id = Column(Integer, ForeignKey('busses.name'))
    transaction_id = Column(Integer, ForeignKey('transactions.id'), primary_key=True)

    def __init__(self, from_id=None, to_id=None, transaction_id=None):
        self.from_id = from_id
        self.to_id = to_id
        self.transaction_id = transaction_id


class MissionHubAssociation(Base):
    __tablename__ = 'mission_hub'

    mission_id = Column(Integer, ForeignKey('missions.name'), primary_key=True)
    hub_id = Column(Integer, ForeignKey('hubs.name'))


class MissionCarAssociation(Base):
    __tablename__ = 'mission_car'

    mission_id = Column(Integer, ForeignKey('missions.name'), primary_key=True)
    hub_id = Column(Integer, ForeignKey('cars.name'))


class MissionDroneAssociation(Base):
    __tablename__ = 'mission_drone'

    mission_id = Column(Integer, ForeignKey('missions.name'), primary_key=True)
    hub_id = Column(Integer, ForeignKey('drones.name'))


class MissionBusAssociation(Base):
    __tablename__ = 'mission_bus'

    mission_id = Column(Integer, ForeignKey('missions.name'), primary_key=True)
    hub_id = Column(Integer, ForeignKey('busses.name'))


class Experiment(Base):
    __tablename__ = 'experiments'

    session = Column(String, nullable=False, primary_key=True)
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

    def __init__(self, session=None, topology=None, start_time=None, end_time=None, duration=None):
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
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
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
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
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


class Hub(Base):
    __tablename__ = 'hubs'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    name = Column(String, nullable=False, primary_key=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    position = Column(String, nullable=False)

    missions = relationship('MissionHubAssociation')
    parcels = relationship('HubParcelTable')

    def __init__(self, experiment_id=None, name=None, position=None):
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.position = position

    def __repr__(self):
        return f'<{self.name}: {self.position}>'


class Car(Base):
    __tablename__ = 'cars'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    name = Column(String, nullable=False, primary_key=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    speed = Column(Integer, nullable=False)
    missions = relationship('MissionCarAssociation')

    timestamps = relationship('CarTimestamp')

    def __init__(self, experiment_id=None, name=None, speed=None):
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.speed = speed

    def __repr__(self):
        return f'<{self.name}: ({self.speed}>'


class Drone(Base):
    __tablename__ = 'drones'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    name = Column(String, primary_key=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    speed = Column(Integer, nullable=False)
    missions = relationship('MissionDroneAssociation')

    timestamps = relationship('DroneTimestamp')

    def __init__(self, name=None, experiment_id=None, speed=None):
        self.name = name
        self.experiment_id: Optional[int] = experiment_id
        self.speed = speed

    def __repr__(self):
        return f'<{self.name}: ({self.speed}>'


class Bus(Base):
    __tablename__ = 'busses'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    name = Column(String, primary_key=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    speed = Column(Integer, nullable=False)
    capacity = Column(Integer, nullable=False)
    route = Column(Text)
    missions = relationship('MissionBusAssociation')

    def __init__(self, experiment_id=None, name=None, speed=None, capacity=None, route=None):
        self.experiment_id: Optional[int] = experiment_id
        self.name = name
        self.speed = speed
        self.capacity = capacity
        self.route = route

    def __repr__(self):
        return f'<{self.name}: ({self.speed}, {self.capacity})'


class Transaction(Base):
    __tablename__ = 'transactions'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=False)
    time_created = Column(DateTime, nullable=False)
    time_completed = Column(DateTime, nullable=False)

    def __init__(self, id=None, experiment_id=None, parcel_id=None, time_created=None, time_completed=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.parcel_id = parcel_id
        self.time_created = time_created
        self.time_completed = time_completed

    def __repr__(self):
        return f'<{self.id}>'


class Mission(Base):
    __tablename__ = 'missions'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    name = Column(String, primary_key=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)

    timestamps = relationship('MissionTimestamp')
    hub = relationship('MissionHubAssociation')
    drone = relationship('MissionDroneAssociation')
    car = relationship('MissionCarAssociation')
    bus = relationship('MissionBusAssociation')

    def __init__(self, id=None, experiment_id=None, name=None, state=None, time=None):
        self.name = name
        self.experiment_id: Optional[int] = experiment_id

    def __repr__(self):
        return f'<{self.state}>'


class MissionTimestamp(Base):
    __tablename__ = 'mission_timestamps'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True)
    mission_id = Column(HybridType, ForeignKey('missions.name'))
    state = Column(String)
    time = Column(DateTime, nullable=False)

    def __init__(self, id=None, mission_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.mission_id = mission_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.state}>'


class Task(Base):
    __tablename__ = 'tasks'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    experiment_id = Column(HybridType, ForeignKey('experiments.session'), nullable=False)
    mission_id = Column(HybridType, ForeignKey('missions.name'), nullable=False)
    type = Column(String, nullable=False)
    state = Column(String)
    destination_x = Column(Integer)
    destination_y = Column(Integer)
    transaction_id = Column(HybridType, ForeignKey('transactions.id'))

    def __init__(self, id=None, experiment_id=None, mission_id=None, type=None, state=None, destination_x=None,
                 destination_y=None, transaction_id=None):
        self.id: Optional[int] = id
        self.experiment_id: Optional[int] = experiment_id
        self.mission_id = mission_id
        self.type = type
        self.state = state
        self.destination_x = destination_x
        self.destination_y = destination_y
        self.transaction_id = transaction_id

    def __repr__(self):
        return f'<{self.type}, {self.state}, ({self.destination_x},{self.destination_y})>'


class TaskTimestamp(Base):
    __tablename__ = 'task_timestamps'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    task_id = Column(HybridType, ForeignKey('tasks.id'), nullable=False)
    state = Column(String, nullable=False)
    time = Column(DateTime, nullable=False)

    def __init__(self, id=None, task_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.task_id = task_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.type}, {self.state}, ({self.destination_x},{self.destination_y})>'


class CarTimestamp(Base):
    __tablename__ = 'car_timestamps'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    car_id = Column(HybridType, ForeignKey('cars.name'), nullable=False)
    task_id = Column(Text)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=True)
    state = Column(String, nullable=True)
    time = Column(DateTime)

    def __init__(self, id=None, car_name=None, task_id=None, position_x=None,
                 position_y=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.car_id = car_name
        self.task_id = task_id
        self.position_x = position_x
        self.position_y = position_y
        self.parcel_id = parcel_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y}), {self.state}>'


class DroneTimestamp(Base):
    __tablename__ = 'drone_timestamps'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    drone_id = Column(HybridType, ForeignKey('drones.name'), nullable=False)
    task_id = Column(Text, nullable=True)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    parcel_id = Column(HybridType, ForeignKey('parcels.id'), nullable=True)
    state = Column(String, nullable=True)
    time = Column(DateTime)

    def __init__(self, id=None, drone_name=None, task_id=None, position_x=None,
                 position_y=None, parcel_id=None, state=None, time=None):
        self.id: Optional[int] = id
        self.drone_id = drone_name
        self.task_id = task_id
        self.position_x = position_x
        self.position_y = position_y
        self.parcel_id = parcel_id
        self.state = state
        self.time = time

    def __repr__(self):
        return f'<{self.name}: ({self.position_x}, {self.position_y}), {self.state}>'


class BusTimestamp(Base):
    __tablename__ = 'bus_timestamps'

    HybridType = Integer()
    HybridType = HybridType.with_variant(BigInteger(), 'postgresql')

    id = Column(HybridType, primary_key=True, autoincrement=True)
    bus_id = Column(HybridType, ForeignKey('busses.name'), nullable=False)
    task_id = Column(Text)
    position_x = Column(Integer, nullable=False)
    position_y = Column(Integer, nullable=False)
    state = Column(String, nullable=False)
    next_stop = Column(String, nullable=False)
    parcels = relationship('Parcel', secondary=bus_parcel_table)
    tasks = relationship('Task', secondary=bus_task_table)
    active_tasks = relationship('Task', secondary=bus_active_task_table)
    time = Column(DateTime)

    def __init__(self, id=None, position_x=None, position_y=None, parcel_id=None,
                 state=None, next_stop=None, time=None):
        self.id: Optional[int] = id
        self.position_x = position_x
        self.position_y = position_y
        self.parcel_id = parcel_id
        self.state = state
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

        self.engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=3600) # , future=True)
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

    @try_with_session()
    def get_drone(self, drone_name):
        return self.session.query(Drone).get(drone_name)

    @try_with_session()
    def get_car(self, car_name):
        return self.session.query(Car).get(car_name)

    @try_with_session(commit=True)
    def create_hub(self, name: str, experiment_id: int, position: str):
        hub = Hub(name=name, experiment_id=experiment_id, position=position)
        self.session.add(hub)
        return hub

    @try_with_session(commit=True)
    def create_drone(self, name: str, experiment_id: int, speed: int):
        drone = Drone(name=name, experiment_id=experiment_id, speed=speed)
        self.session.add(drone)
        return drone

    @try_with_session(commit=True)
    def create_car(self, name: str, experiment_id: int, speed: int):
        car = Car(name=name, experiment_id=experiment_id, speed=speed)
        self.session.add(car)
        return car

    @try_with_session(commit=True)
    def add_timestamp_to_drone(self, drone_name: str, position_x: int,
                               position_y: int, state: str, parcel_id: int = None, task_id: int = None):
        drone = self.session.query(Drone).get(drone_name)
        timestamp = drone.timestamps.append(DroneTimestamp(drone_name=drone_name, parcel_id=parcel_id, task_id=task_id,
                                                           position_x=position_x, position_y=position_y, state=state,
                                                           time=datetime.now()))
        return timestamp

    @try_with_session(commit=True)
    def add_timestamp_to_car(self, car_name: str, position_x: int,
                             position_y: int, state: str, parcel_id: int = None, task_id: int = None):
        car = self.session.query(Car).get(car_name)
        timestamp = car.timestamps.append(CarTimestamp(car_name=car_name, parcel_id=parcel_id, task_id=task_id,
                                                       position_x=position_x, position_y=position_y, state=state,
                                                       time=datetime.now()))
        return timestamp

    @try_with_session(commit=True)
    def add_parcel_to_hub(self, hub_name: str, parcel_id: int):
        hub = self.session.query(Hub).get(hub_name)
        parcel = hub.parcels.append(HubParcelTable(parcel_id=parcel_id, hub_id=hub_name,
                                                   time_received=datetime.now()))
        return parcel

    @try_with_session(commit=True)
    def mark_parcel_as_picked_up(self, parcel_id: int):
        parcel = self.session.query(HubParcelTable).get(parcel_id)
        parcel.time_completed = datetime.now()
        return parcel

    @try_with_session(commit=True)
    def create_mission(self, name: str, vehicle_id: str, experiment_id: int, state: str, type: str):
        assert type in ['hub', 'drone', 'car', 'bus'], 'Unknown vehicle type'

        mission = Mission(name=name, experiment_id=experiment_id)
        mission.timestamps.append(MissionTimestamp(mission_id=mission.name, state=state, time=datetime.now()))

        if type == 'hub':
            mission.hub.append(MissionHubAssociation(mission_id=mission.name, hub_id=hub_id))
        elif type == 'drone':
            mission.drone.append(MissionHubAssociation(mission_id=mission.name, hub_id=drone_id))
        elif type == 'car':
            mission.car.append(MissionHubAssociation(mission_id=mission.name, hub_id=car_id))
        else:
            mission.drone.append(MissionHubAssociation(mission_id=mission.name, hub_id=bus_id))

        self.session.add(mission)
        return mission

    @try_with_session()
    def get_task(self, id):
        return self.session.query(Task).get(id)

    @try_with_session(commit=True)
    def create_task(self, mission_id: str, experiment_id: str, type: str, state,
                    destination_x: int, destination_y: int, transaction_id: str):
        task = Task(experiment_id=experiment_id, mission_id=mission_id,
                    type=type, state=state, destination_x=destination_x,
                    destination_y=destination_y, transaction_id=transaction_id)
        self.session.add(task)
        return car

    def export_drone_data(self, experiment_id: str):
        with self.engine.connect()  as con:
            query = f"select  * " \
                    f"from drone_timestamps " \
                    f"inner join drones on drone_timestamps.drone_id=drones.name " \
                    f"where experiment_id='{experiment_id}';"
            result = con.execute(query)
            df = pd.DataFrame(result.fetchall())
            df.columns = result.keys()
            return df
