if [ ! -z "$(git status --porcelain schemes/)" ]; then
    git config user.name "Lungers Bot"
    git config user.email "github-bot@lungers.com"
    git add schemes/
    git commit -m "Update to layer $(grep -oP '(?<=^// LAYER )([0-9]+)$' schemes/latest.tl || echo unknown)"
    git push
fi
