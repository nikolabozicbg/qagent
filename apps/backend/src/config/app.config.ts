export default () => ({
  app: {
    name: 'qagenai-backend',
    port: parseInt(process.env.PORT, 10) || 3001,
  },
});
