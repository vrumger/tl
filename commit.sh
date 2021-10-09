if [ ! -z "$(git status --porcelain schemes/)" ]; then
    git config user.name "Lungers Bot"
    git config user.email "github-bot@lungers.com"
    git add schemes/
    git commit -m "Update TL scheme"
    git push
fi
