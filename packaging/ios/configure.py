#!/usr/bin/env python3
"""Configure the generated Capacitor project deterministically; no signing credentials are required."""
import hashlib
import json
import plistlib
from pathlib import Path

root = Path(__file__).resolve().parents[2]
app = root / 'ios/App/App'
project = root / 'ios/App/App.xcodeproj/project.pbxproj'
text = project.read_text()
for source in ['FoliaViewController.swift', 'FoliaNativePlugin.swift', 'FoliaBackendSettings.swift']:
    file_id = hashlib.sha256(('file:' + source).encode()).hexdigest()[:24].upper()
    build_id = hashlib.sha256(('build:' + source).encode()).hexdigest()[:24].upper()
    if file_id in text:
        continue
    text = text.replace('/* Begin PBXBuildFile section */', f'/* Begin PBXBuildFile section */\n\t\t{build_id} /* {source} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_id} /* {source} */; }};')
    text = text.replace('/* Begin PBXFileReference section */', f'/* Begin PBXFileReference section */\n\t\t{file_id} /* {source} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {source}; sourceTree = "<group>"; }};')
    text = text.replace('504EC3071FED79650016851F /* AppDelegate.swift */,', f'504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\t{file_id} /* {source} */,')
    text = text.replace('504EC3081FED79650016851F /* AppDelegate.swift in Sources */,', f'504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t\t\t{build_id} /* {source} in Sources */,')
text = text.replace('IPHONEOS_DEPLOYMENT_TARGET = 13.0;', 'IPHONEOS_DEPLOYMENT_TARGET = 16.0;')
version = json.loads((root / 'package.json').read_text())['version']
text = text.replace('MARKETING_VERSION = 1.0;', f'MARKETING_VERSION = {version};')
# String catalogs are compiled by Xcode and localize native iOS sheets using the same languages as the frontend.
catalog = 'Localizable.xcstrings'
if catalog not in text:
    fid = hashlib.sha256(catalog.encode()).hexdigest()[:24].upper()
    bid = hashlib.sha256(('build:' + catalog).encode()).hexdigest()[:24].upper()
    text = text.replace('/* Begin PBXBuildFile section */', f'/* Begin PBXBuildFile section */\n\t\t{bid} = {{isa = PBXBuildFile; fileRef = {fid}; }};')
    text = text.replace('/* Begin PBXFileReference section */', f'/* Begin PBXFileReference section */\n\t\t{fid} = {{isa = PBXFileReference; lastKnownFileType = text.json.xcstrings; path = {catalog}; sourceTree = "<group>"; }};')
    text = text.replace('504EC3071FED79650016851F /* AppDelegate.swift */,', f'504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\t{fid} /* {catalog} */,')
    text = text.replace('504EC30D1FED79650016851F /* Main.storyboard in Resources */,', f'504EC30D1FED79650016851F /* Main.storyboard in Resources */,\n\t\t\t\t{bid} /* {catalog} in Resources */,')
project.write_text(text)
podfile = root / 'ios/App/Podfile'
podfile.write_text(podfile.read_text().replace("platform :ios, '13.0'", "platform :ios, '16.0'"))
storyboard = app / 'Base.lproj/Main.storyboard'
storyboard.write_text(storyboard.read_text().replace('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="FoliaViewController" customModule="App"'))
info_path = app / 'Info.plist'
info = plistlib.loads(info_path.read_bytes())
info.update({
    'UIRequiredDeviceCapabilities': ['arm64'],
    'UIBackgroundModes': ['audio'],
    'UIFileSharingEnabled': True,
    'LSSupportsOpeningDocumentsInPlace': True,
    'CFBundleLocalizations': ['en', 'zh-Hans', 'zh-Hant', 'id'],
    # User-owned compatible backends can be plain HTTP on the local network.
    'NSAppTransportSecurity': {'NSAllowsArbitraryLoads': True},
    'NSLocalNetworkUsageDescription': 'Connect to music servers you configure on your local network.',
    'CADisableMinimumFrameDurationOnPhone': True,
    'ITSAppUsesNonExemptEncryption': False,
})
info_path.write_bytes(plistlib.dumps(info, sort_keys=False))
print('Configured iOS 16.0 project, native bridges, orientations and playback audio mode.')
