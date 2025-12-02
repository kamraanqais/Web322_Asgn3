const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    dueDate: DataTypes.DATEONLY,
    status: { type: DataTypes.STRING, defaultValue: 'pending' },
    userId: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'tasks',
    freezeTableName: true,
    timestamps: true
  });

  return Task;
};