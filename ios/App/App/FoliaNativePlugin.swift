import Foundation
import UIKit
import UniformTypeIdentifiers
import Capacitor

// Persistent music access is limited to explicit user-selected copies inside this app's sandbox.
@objc(FoliaNativePlugin)
public class FoliaNativePlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "FoliaNativePlugin"
    public let jsName = "FoliaNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setAppearance", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configuration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickDirectory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listDirectory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeDirectory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resolveFile", returnType: CAPPluginReturnPromise)
    ]
    private var pickerCall: CAPPluginCall?
    private var settingsOpen = false
    private let ioQueue = DispatchQueue(label: "top.izuna.folia.file-import", qos: .userInitiated)
    private func endpoints() -> [String: String] {
        UserDefaults.standard.dictionary(forKey: "folia.ios.backends.v1") as? [String: String] ?? [:]
    }
    private func musicRoot() throws -> URL {
        let docs = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let root = docs.appendingPathComponent("ImportedMusic", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root.resolvingSymlinksInPath()
    }
    // Reject symlinks, traversal, absolute paths and unknown roots before exposing a native file URL.
    private func path(_ call: CAPPluginCall) throws -> URL {
        guard let id = call.getString("root"), UUID(uuidString: id) != nil else { throw CocoaError(.fileReadInvalidFileName) }
        let relative = call.getString("path") ?? ""
        let parts = relative.split(separator: "/", omittingEmptySubsequences: false)
        guard !relative.hasPrefix("/"), !relative.contains("\\"),
              !parts.contains(".."), !parts.contains("."), !relative.contains("\0") else { throw CocoaError(.fileReadInvalidFileName) }
        let root = try musicRoot().appendingPathComponent(id, isDirectory: true).standardizedFileURL
        let candidate = relative.isEmpty ? root : root.appendingPathComponent(relative).standardizedFileURL
        let resolvedRoot = root.resolvingSymlinksInPath()
        let resolved = candidate.resolvingSymlinksInPath()
        guard root.path == resolvedRoot.path,
              resolved.path == candidate.path,
              resolved.path == root.path || resolved.path.hasPrefix(root.path + "/") else { throw CocoaError(.fileReadNoPermission) }
        return resolved
    }
    @objc func setAppearance(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let controller = self.bridge?.viewController as? FoliaViewController else { call.reject("Native view is unavailable"); return }
            switch call.getString("mode") {
            case "light": controller.overrideUserInterfaceStyle = .light; controller.statusBarStyle = .darkContent
            case "dark": controller.overrideUserInterfaceStyle = .dark; controller.statusBarStyle = .lightContent
            default: controller.overrideUserInterfaceStyle = .unspecified; controller.statusBarStyle = .default
            }
            controller.setNeedsStatusBarAppearanceUpdate()
            call.resolve()
        }
    }
    @objc func configuration(_ call: CAPPluginCall) { call.resolve(["endpoints": endpoints()]) }
    @objc func configure(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.settingsOpen, let controller = self.bridge?.viewController else { call.reject("Settings are already open"); return }
            self.settingsOpen = true
            let settings = FoliaBackendSettings(endpoints: self.endpoints())
            settings.onFinish = { result in
                self.settingsOpen = false
                call.resolve(["saved": result != nil, "endpoints": result ?? self.endpoints()])
            }
            let navigation = UINavigationController(rootViewController: settings)
            navigation.isModalInPresentation = true
            controller.present(navigation, animated: true)
        }
    }
    @objc func pickDirectory(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pickerCall == nil, let controller = self.bridge?.viewController else { call.reject("File picker is already open"); return }
            self.pickerCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder], asCopy: false)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            controller.present(picker, animated: true)
        }
    }
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickerCall?.reject("Import cancelled", "CANCELLED")
        pickerCall = nil
    }
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pickerCall, let selected = urls.first else { return }
        pickerCall = nil
        ioQueue.async {
            let access = selected.startAccessingSecurityScopedResource()
            defer { if access { selected.stopAccessingSecurityScopedResource() } }
            var destination: URL?
            do {
                let id = UUID().uuidString
                let target = try self.musicRoot().appendingPathComponent(id, isDirectory: true)
                destination = target
                var coordinationError: NSError?
                var copyError: Error?
                NSFileCoordinator().coordinate(readingItemAt: selected, options: .withoutChanges, error: &coordinationError) { source in
                    do { try FileManager.default.copyItem(at: source, to: target) }
                    catch { copyError = error }
                }
                if let error = coordinationError { throw error }
                if let error = copyError { throw error }
                call.resolve(["root": id, "name": selected.lastPathComponent])
            } catch {
                if let target = destination { try? FileManager.default.removeItem(at: target) }
                call.reject("Unable to copy the selected music folder", "IMPORT_FAILED")
            }
        }
    }
    @objc func listDirectory(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let url = try self.path(call)
                let entries = try FileManager.default.contentsOfDirectory(at: url,
                    includingPropertiesForKeys: [.isDirectoryKey, .isRegularFileKey, .isSymbolicLinkKey], options: [])
                let items: [[String: Any]] = try entries.compactMap { entry in
                    let info = try entry.resourceValues(forKeys: [.isDirectoryKey, .isRegularFileKey, .isSymbolicLinkKey])
                    guard info.isSymbolicLink != true, info.isDirectory == true || info.isRegularFile == true else { return nil }
                    return ["name": entry.lastPathComponent, "kind": info.isDirectory == true ? "directory" : "file"]
                }
                call.resolve(["entries": items])
            } catch { call.reject("Unable to read imported folder", "READ_FAILED") }
        }
    }
    @objc func removeDirectory(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                guard (call.getString("path") ?? "").isEmpty else { throw CocoaError(.fileReadNoPermission) }
                let url = try self.path(call)
                if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
                call.resolve()
            } catch { call.reject("Unable to remove imported copy", "REMOVE_FAILED") }
        }
    }
    @objc func resolveFile(_ call: CAPPluginCall) {
        ioQueue.async {
            do {
                let url = try self.path(call)
                let info = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey])
                guard info.isRegularFile == true else { throw CocoaError(.fileReadNoSuchFile) }
                call.resolve(["url": url.absoluteString, "size": info.fileSize ?? 0,
                              "modified": (info.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000])
            } catch { call.reject("Unable to read imported file", "READ_FAILED") }
        }
    }
}
