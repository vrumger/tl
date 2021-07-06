if [ ! -z "$(git status --porcelain)" ]; then
    git config user.name "Lungers Bot"
    git config user.email "github-bot@lungers.com"
    git add .
    git commit -m "Update TL scheme"
    git push
fi
