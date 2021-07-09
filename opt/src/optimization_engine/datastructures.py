from collections import namedtuple
import enum


# #################### Enums ######################
# enum serializable to JSON: either IntEnum, or multi-inheritance DroneState(str, enum) or
class DroneState(enum.IntEnum):
    IDLE = 0
    MOVING = 1
    WAITING_FOR_TRANSACTION = 2
    EXECUTING_TRANSACTION = 3
    CHARGING = 4


class VehicleState(enum.Enum):
    IDLE = 0
    MOVING = 1
    PLANNED_STOP = 2
    TRANSACTION_STATE = 3
    CHARGING = 4


# TODO enum values not capitalized since they are defined like that in the js entities...
class TaskState(enum.Enum):
    notStarted = 0
    ongoing = 1
    waitingForTransaction = 2
    executingTransaction = 3
    completed = 4


# #################### Namedtuples ######################

Hub = namedtuple('Hub', 'id position transactions parcels')

Drone = namedtuple('Drone', 'id position speed parcel state')

Car = namedtuple('Car', 'id position speed parcel state')

Bus = namedtuple('Bus', 'id position capacity route nextStop missions activeMissions speed parcels activeTasks '
                        'tasksAtStop arrivalTimeAtStop state')  # TODO just state instead of all the other stuff??

Parcel = namedtuple('Parcel', 'id carrier destination')

Route = namedtuple('Route', 'distance path')
Routes = namedtuple('Routes', 'air1 road air2')  # container for subroutes of complete route

# TODO also candidates for namedtuples:
#       location ('x y z')      <-- not good, since they are sent via json to JS modules
#       route('path distance')  <- as part of the Routes tuple
#       Transaction / Mission   <-- not good, since they are sent via json to JS modules
