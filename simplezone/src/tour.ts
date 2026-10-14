// Screenshot tour, for the "Simple Zone iOS" GitHub check only (built with VITE_TOUR=1).
// It never ships in the real app. It loads sample businesses, then steps through each
// screen and logs "SZ-TOUR <screen>" so the check knows when to take each screenshot.

/** Sample rows in the same layout as the "Simplezone live" sheet. Not real businesses. */
export const TOUR_CSV = `Name,Area,Category,What they sell,Opening hours,Whatsapp,Phone ,Website,Plus
Aurora Glance,Southampton,Apps & websites,"apps, websites",,07367 414672,,auroraglance.com,No
Sample Café,Shirley,Café,"coffee, tea, cake, breakfast",Mon-Fri 8am-5pm; Sat 9-4,,023 8000 0000,,Yes
Sample Barber,Portswood,Hair,"haircut, beard trim",By appointment,07000 000000,,,No`;

export type TourStep = { name: string; run: () => void };

export async function runTour(steps: TourStep[], wait = 6000) {
  for (const step of steps) {
    step.run();
    await new Promise((r) => setTimeout(r, 600));
    console.log(`SZ-TOUR ${step.name}`);
    await new Promise((r) => setTimeout(r, wait));
  }
  console.log('SZ-TOUR done');
}
