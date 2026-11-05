import UIKit

// Backend addresses are local configuration only; account credentials never enter this form.
final class FoliaBackendSettings: UITableViewController {
    static let ids = ["netease", "qq", "kugou", "spotify", "ytm", "bodian", "qishui"]
    private let names = ["NetEase", "QQ Music", "KuGou", "Spotify gateway", "YouTube Music gateway", "Bodian gateway", "Qishui gateway"]
    private var fields: [UITextField] = []
    var onFinish: (([String: String]?) -> Void)?

    init(endpoints: [String: String]) {
        super.init(style: .insetGrouped)
        fields = Self.ids.map { id in
            let field = UITextField()
            field.text = endpoints[id] ?? ""
            field.placeholder = "https://"
            field.keyboardType = .URL
            field.autocorrectionType = .no
            field.autocapitalizationType = .none
            field.clearButtonMode = .whileEditing
            field.accessibilityLabel = id
            return field
        }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = NSLocalizedString("Backend services", comment: "")
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancel))
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .save, target: self, action: #selector(save))
        isModalInPresentation = true
    }
    override func numberOfSections(in tableView: UITableView) -> Int { Self.ids.count }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { 1 }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? { names[section] }
    override func tableView(_ tableView: UITableView, titleForFooterInSection section: Int) -> String? {
        section == 0 ? NSLocalizedString("Use your own compatible API. Local audio is never uploaded.", comment: "") : nil
    }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .default, reuseIdentifier: nil)
        let field = fields[indexPath.section]
        field.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.addSubview(field)
        NSLayoutConstraint.activate([
            field.leadingAnchor.constraint(equalTo: cell.contentView.layoutMarginsGuide.leadingAnchor),
            field.trailingAnchor.constraint(equalTo: cell.contentView.layoutMarginsGuide.trailingAnchor),
            field.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 12),
            field.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -12)
        ])
        return cell
    }
    @objc private func cancel() { finish(nil) }
    @objc private func save() {
        var endpoints: [String: String] = [:]
        for (index, field) in fields.enumerated() {
            let raw = (field.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if raw.isEmpty { continue }
            guard let url = URLComponents(string: raw),
                  ["http", "https"].contains(url.scheme?.lowercased() ?? ""),
                  let host = url.host, !host.isEmpty,
                  url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else {
                let alert = UIAlertController(title: NSLocalizedString("Invalid backend URL", comment: ""), message: names[index], preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: NSLocalizedString("OK", comment: ""), style: .default))
                present(alert, animated: true)
                return
            }
            endpoints[Self.ids[index]] = raw
        }
        UserDefaults.standard.set(endpoints, forKey: "folia.ios.backends.v1")
        finish(endpoints)
    }
    private func finish(_ endpoints: [String: String]?) {
        dismiss(animated: true) { self.onFinish?(endpoints); self.onFinish = nil }
    }
}
