let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const getSocketIO = () => ioInstance;

module.exports = {
  setSocketIO,
  getSocketIO,
};

