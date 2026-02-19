export default async function onSetup() {
  // Set a consistent time zone for the testing environment
  process.env.TZ = 'Asia/Dubai'
}
