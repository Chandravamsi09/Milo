import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def count_lines(directory):
    total = 0
    file_counts = {}
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.git' in root or 'dist' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.js', '.css', '.html', '.md', '.json', '.py')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = len(f.readlines())
                        total += lines
                        rel = os.path.relpath(filepath, PROJECT_ROOT)
                        file_counts[rel] = lines
                except Exception as e:
                    pass
    return total, file_counts

if __name__ == '__main__':
    total, file_counts = count_lines(PROJECT_ROOT)
    print("==========================================")
    print("  MILO LINE COUNT VERIFICATION REPORT     ")
    print("==========================================")
    print(f"Total Lines of Code (LOC): {total:,}")
    print(f"Total Files Analyzed: {len(file_counts)}")
    print("------------------------------------------")
    if total >= 50000:
        print("[SUCCESS] Codebase satisfies requirement >= 50,000 LOC!")
    else:
        print("✗ WARNING: Codebase currently under 50,000 LOC")
