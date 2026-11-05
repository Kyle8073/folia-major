import UIKit
import Capacitor
import AVFAudio

// Registers the local native bridges without impersonating the Electron desktop runtime.
@objc(FoliaViewController)
class FoliaViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FoliaNativePlugin())
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            NSLog("[FoliaIOS] Audio session activation failed")
        }
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .allButUpsideDown }
}
