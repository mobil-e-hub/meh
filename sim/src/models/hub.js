module.exports = class Hub {
    constructor(id, position, capacity = 1000) {
        this.id = id;
        this.capacity = capacity;
        this.position = position;
        this.transactions = { };
        this.parcels = {  };
    }

    addParcel(parcel) {
        let success = Object.keys(this.parcels).length < this.capacity;
        if(success) {
            this.parcels[parcel.id] = parcel;
        }
        return success;
    }
};
