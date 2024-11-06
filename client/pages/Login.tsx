const loginEndPoint = 'http://localhost:5174';

export default function Login() {
  return (
    <div className="h-svh w-svh bg-black flex flex-col items-center justify-center overflow-hidden">
      <h2 className="text-white text-4xl font-bold pb-12">
        Zunify for Spotify
      </h2>
      <a
        className="flex items-center bg-[rgb(30,215,96)] text-black px-4 py-2 rounded-full"
        href={loginEndPoint}
      >
        <p className="font-bold text-lg">Log in with Spotify</p>
      </a>
    </div>
  );
}
